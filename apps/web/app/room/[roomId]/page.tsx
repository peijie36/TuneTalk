"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LogOut, Send, Users } from "lucide-react";

import type {
  RoomChatMessage,
  RoomPresenceParticipant,
  RoomRealtimeEvent,
} from "@tunetalk/shared/room-realtime";

import { ApiError, leaveRoom } from "@/api/rooms";
import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRoom } from "@/hooks/use-room";
import { useRoomMessages } from "@/hooks/use-room-messages";
import { authClient } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { getInitials, normalizeText } from "@/utils/string-utils";

function toWebSocketUrl(baseUrl: string) {
  if (baseUrl.startsWith("https://")) return `wss://${baseUrl.slice(8)}`;
  if (baseUrl.startsWith("http://")) return `ws://${baseUrl.slice(7)}`;
  return baseUrl;
}

function parseWsEvent(data: string): RoomRealtimeEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const type = record.type;

  if (type === "ping" || type === "pong") return { type } as RoomRealtimeEvent;

  if (type === "room_disbanded" && typeof record.roomId === "string") {
    return { type: "room_disbanded", roomId: record.roomId };
  }

  if (
    type === "presence" &&
    typeof record.roomId === "string" &&
    Array.isArray(record.participants)
  ) {
    const participants: RoomPresenceParticipant[] = [];
    for (const item of record.participants) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const id = typeof p.id === "string" ? p.id : null;
      const name = typeof p.name === "string" ? p.name : null;
      const role = p.role === "host" || p.role === "member" ? p.role : null;
      if (id && name && role) participants.push({ id, name, role });
    }

    return { type: "presence", roomId: record.roomId, participants };
  }

  if (
    type === "chat" &&
    typeof record.roomId === "string" &&
    typeof record.id === "string" &&
    typeof record.text === "string" &&
    typeof record.createdAt === "string" &&
    record.sender &&
    typeof record.sender === "object"
  ) {
    const sender = record.sender as Record<string, unknown>;
    const senderId = typeof sender.id === "string" ? sender.id : null;
    const senderName = typeof sender.name === "string" ? sender.name : null;
    if (!senderId || !senderName) return null;

    return {
      type: "chat",
      roomId: record.roomId,
      id: record.id,
      sender: { id: senderId, name: senderName },
      text: record.text,
      createdAt: record.createdAt,
    };
  }

  return null;
}

export default function RoomPage() {
  const routeParams = useParams<{ roomId?: string | string[] }>();
  const roomId = useMemo(() => {
    return typeof routeParams.roomId === "string"
      ? routeParams.roomId
      : Array.isArray(routeParams.roomId)
        ? (routeParams.roomId[0] ?? "unknown")
        : "unknown";
  }, [routeParams.roomId]);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [participantQuery, setParticipantQuery] = useState("");
  const deferredParticipantQuery = useDeferredValue(participantQuery);
  const [participants, setParticipants] = useState<RoomPresenceParticipant[]>(
    []
  );

  const [messageDraft, setMessageDraft] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const sessionUserId = session?.user?.id ?? null;

  const roomQuery = useRoom(roomId);

  const room = roomQuery.data ?? null;
  const isLoadingRoom = roomQuery.isFetching && !roomQuery.data;

  useEffect(() => {
    const error = roomQuery.error;
    if (!error) return;

    if (error instanceof ApiError) {
      if (error.status === 404) {
        router.replace(
          roomQuery.data
            ? "/discover?toast=disbanded"
            : "/discover?toast=room_not_found"
        );
        return;
      }

      if (error.status === 401 || error.status === 403) {
        router.replace("/discover?toast=password_required");
        return;
      }
    }
  }, [roomQuery.data, roomQuery.error, router]);

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!roomId || roomId === "unknown") throw new Error("Missing room id");
      return await leaveRoom(roomId);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });

      router.replace(
        "disbanded" in result && result.disbanded
          ? "/discover?toast=disbanded"
          : "/discover"
      );
    },
  });

  const isLeaving = leaveMutation.isPending;

  const messagesQuery = useRoomMessages(roomId, !!roomQuery.data);
  const messages = messagesQuery.data?.messages ?? [];

  useEffect(() => {
    if (!roomId || roomId === "unknown") return;
    if (!sessionUserId) return;
    if (!roomQuery.data) return;

    const url = `${toWebSocketUrl(API_BASE_URL)}/api/rooms/${encodeURIComponent(roomId)}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;

      const parsed = parseWsEvent(event.data);
      if (!parsed) return;

      if (parsed.type === "ping") {
        ws.send("pong");
        return;
      }

      if (parsed.type === "room_disbanded" && parsed.roomId === roomId) {
        void queryClient.invalidateQueries({ queryKey: ["rooms"] });
        router.replace("/discover?toast=disbanded");
        return;
      }

      if (parsed.type === "presence" && parsed.roomId === roomId) {
        setParticipants(parsed.participants);
        return;
      }

      if (parsed.type === "chat" && parsed.roomId === roomId) {
        const message: RoomChatMessage = {
          id: parsed.id,
          sender: parsed.sender,
          text: parsed.text,
          createdAt: parsed.createdAt,
        };

        queryClient.setQueryData(
          ["roomMessages", roomId],
          (
            current:
              | { messages: RoomChatMessage[]; nextCursor: string | null }
              | undefined
          ) => {
            const existing = current?.messages ?? [];
            if (existing.some((m) => m.id === message.id)) {
              return current ?? { messages: existing, nextCursor: null };
            }

            const next = [...existing, message].sort(
              (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
            );

            return {
              messages: next,
              nextCursor: current?.nextCursor ?? null,
            };
          }
        );
      }
    });

    ws.addEventListener("close", (event) => {
      if (wsRef.current === ws) wsRef.current = null;

      if (event.code === 1008) {
        router.replace("/discover?toast=password_required");
      }
    });

    return () => {
      if (wsRef.current === ws) wsRef.current = null;
      ws.close();
    };
  }, [queryClient, roomId, roomQuery.data, router, sessionUserId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const filteredParticipants = useMemo(() => {
    const q = normalizeText(deferredParticipantQuery);
    if (!q) return participants;
    return participants.filter((participant) =>
      normalizeText(participant.name).includes(q)
    );
  }, [deferredParticipantQuery, participants]);

  const handleLeave = useCallback(() => {
    if (leaveMutation.isPending) return;
    leaveMutation.mutate();
  }, [leaveMutation]);

  const handleSend = useCallback(() => {
    const text = messageDraft.trim();
    if (!text) return;
    if (!wsRef.current) return;

    wsRef.current.send(JSON.stringify({ type: "chat", text }));
    setMessageDraft("");
  }, [messageDraft]);

  const handleMessageKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleSend();
    },
    [handleSend]
  );

  const roomName = room?.name ?? "Room";
  const hostName = room?.host.name ?? "Unknown";
  const visibility = room?.visibility ?? "public";
  const participantStats = room?.participants ?? null;
  const participantCurrent = sessionUserId
    ? participants.length
    : (participantStats?.current ?? null);
  const participantCapacity = participantStats?.capacity ?? null;
  const nowPlaying = room?.nowPlaying ?? null;

  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <AppHeader containerClassName="relative flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <div className="order-1 w-full sm:max-w-[360px]">
          <label htmlFor="participant-search" className="sr-only">
            Search participants
          </label>
          <Input
            id="participant-search"
            value={participantQuery}
            onChange={(event) => setParticipantQuery(event.target.value)}
            placeholder="Search participants..."
            className="h-12 rounded-full bg-white/75 px-5 shadow-sm backdrop-blur"
          />
        </div>

        <PrimaryNav className="order-2 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" />

        <div className="order-3 flex items-center justify-end">
          <AuthButtons />
        </div>
      </AppHeader>

      <main className="tt-container pb-10 lg:pb-6">
        <section
          aria-label="Room"
          className="rounded-[34px] bg-black/55 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8 lg:h-[calc(100dvh-8.5rem)] lg:overflow-hidden lg:p-10"
        >
          <div className="grid gap-8 lg:h-full lg:min-h-0 lg:grid-cols-[340px_1fr] lg:items-start">
            <div className="space-y-6 lg:min-h-0">
              <Card className="bg-surface/80 border-border/70 flex flex-col rounded-[28px] border shadow-sm backdrop-blur">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-text-strong text-base font-semibold">
                      {roomName}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-white/60 backdrop-blur"
                    >
                      {visibility === "private" ? "Private" : "Public"}
                    </Badge>
                  </div>

                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {participantCapacity !== null && participantCurrent !== null
                      ? `${participantCurrent}/${participantCapacity} participants`
                      : "-"}
                  </div>

                  <div className="text-muted-foreground text-xs">
                    {isLoadingRoom ? "Loading room..." : `Host: ${hostName}`}
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
                  <div className="border-border/70 min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white/80 shadow-inner">
                    <div className="border-border/70 border-b px-4 py-3">
                      <div className="text-text-strong text-sm font-semibold">
                        Participants
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {sessionUserId
                          ? "Online participants in this room"
                          : "Sign in to see online participants"}
                      </div>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto px-4 py-3">
                      {!sessionUserId ? (
                        <div className="text-muted-foreground text-sm">
                          Sign in to connect to presence.
                        </div>
                      ) : filteredParticipants.length === 0 ? (
                        <div className="text-muted-foreground text-sm">
                          No participants yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredParticipants.map((participant) => {
                            const isYou = participant.id === sessionUserId;
                            return (
                              <div
                                key={participant.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <Avatar className="h-9 w-9 border border-white/60">
                                    <AvatarFallback>
                                      {getInitials(participant.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="text-text-strong truncate text-sm font-semibold">
                                      {isYou ? "You" : participant.name}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {participant.role}
                                    </div>
                                  </div>
                                </div>

                                {participant.role === "host" ? (
                                  <Badge variant="subtle" className="shrink-0">
                                    Host
                                  </Badge>
                                ) : isYou ? (
                                  <Badge variant="subtle" className="shrink-0">
                                    You
                                  </Badge>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleLeave}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full border-transparent"
                    disabled={isLeaving || isSessionPending || !sessionUserId}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {isLeaving ? "Leaving..." : "Leave"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <Card className="border-border/70 shrink-0 rounded-[28px] border bg-white/70 shadow-sm backdrop-blur">
                <CardHeader className="space-y-1">
                  <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Now playing
                  </div>
                  <CardTitle className="text-text-strong truncate text-base font-semibold">
                    {nowPlaying ? nowPlaying.title : "-"}
                  </CardTitle>
                  <div className="text-muted-foreground truncate text-sm">
                    {nowPlaying ? nowPlaying.artist : "-"}
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-border/70 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border bg-white/70 shadow-sm backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                  <CardTitle className="text-text-strong text-base font-semibold">
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-0">
                  <div
                    ref={chatScrollRef}
                    className="border-border/70 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border bg-white/80 p-4 shadow-inner"
                  >
                    {!sessionUserId ? (
                      <div className="text-muted-foreground text-sm">
                        Sign in to chat (messages are visible).
                      </div>
                    ) : null}

                    {messages.length === 0 ? (
                      <div className="text-muted-foreground text-sm">
                        {messagesQuery.isFetching
                          ? "Loading messages..."
                          : "No messages yet. Say hello!"}
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isYou = message.sender.id === sessionUserId;
                        const avatarLabel = isYou
                          ? (session?.user?.name ??
                            session?.user?.email ??
                            "You")
                          : message.sender.name;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex w-full items-end gap-2",
                              isYou ? "justify-end" : "justify-start"
                            )}
                          >
                            {!isYou ? (
                              <Avatar className="h-9 w-9 border border-white/60">
                                <AvatarFallback>
                                  {getInitials(avatarLabel)}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}

                            <div
                              className={cn(
                                "flex max-w-[78%] flex-col gap-1 sm:max-w-[70%]",
                                isYou ? "items-end text-right" : "items-start"
                              )}
                            >
                              <div className="text-muted-foreground px-1 text-xs font-semibold">
                                {isYou ? "You" : message.sender.name}
                              </div>
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-3 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap shadow-sm",
                                  isYou
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted/70 text-text-strong rounded-bl-md"
                                )}
                              >
                                {message.text}
                              </div>
                            </div>

                            {isYou ? (
                              <Avatar className="h-9 w-9 border border-white/60">
                                <AvatarFallback>
                                  {getInitials(avatarLabel)}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      onKeyDown={handleMessageKeyDown}
                      placeholder={
                        sessionUserId ? "Send a message..." : "Sign in to chat"
                      }
                      className="h-12 rounded-full bg-white/90 shadow-sm backdrop-blur"
                      disabled={!sessionUserId}
                    />
                    <Button
                      type="button"
                      className="h-12 w-12 rounded-full"
                      onClick={handleSend}
                      disabled={!sessionUserId || !messageDraft.trim()}
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
