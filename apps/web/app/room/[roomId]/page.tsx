"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ListMusic,
  LogOut,
  Pause,
  Play,
  Search,
  Send,
  Users,
} from "lucide-react";

import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/utils/cn";
import { getInitials, normalizeText } from "@/utils/string-utils";

import { mockRooms } from "../../discover/rooms-mock";
import { getMockRoom, type RoomMessage } from "./room-mock";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RoomPage() {
  const routeParams = useParams<{ roomId?: string | string[] }>();
  const roomId =
    typeof routeParams.roomId === "string"
      ? routeParams.roomId
      : Array.isArray(routeParams.roomId)
        ? (routeParams.roomId[0] ?? "unknown")
        : "unknown";

  const router = useRouter();
  const { data: session } = authClient.useSession();

  const roomDetail = useMemo(() => getMockRoom(roomId), [roomId]);
  const roomSummary = useMemo(
    () => mockRooms.find((room) => room.id === roomId) ?? null,
    [roomId]
  );
  const participantStats = roomSummary?.participants ?? null;
  const roomName = roomSummary?.name ?? roomDetail.name;
  const hostName = roomSummary?.host.name ?? roomDetail.hostName;
  const nowPlayingTitle =
    roomSummary?.nowPlaying.title ?? roomDetail.currentTrack.title;
  const nowPlayingArtist =
    roomSummary?.nowPlaying.artist ?? roomDetail.currentTrack.artist;

  const [isPlaying, setIsPlaying] = useState(true);
  const [query, setQuery] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState<RoomMessage[]>(
    () => roomDetail.messages
  );
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const upNext = roomDetail.queue.at(0);

  const participants = useMemo(() => {
    const youLabel = session?.user.name ?? session?.user.email ?? "You";

    return roomDetail.participants.map((participant) => {
      if (participant.role === "host" && participant.name !== hostName) {
        return { ...participant, name: hostName };
      }
      if (participant.isYou && participant.name !== youLabel) {
        return { ...participant, name: youLabel };
      }
      return participant;
    });
  }, [
    hostName,
    roomDetail.participants,
    session?.user.email,
    session?.user.name,
  ]);

  const filteredParticipants = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return participants;
    return participants.filter((participant) =>
      normalizeText(participant.name).includes(q)
    );
  }, [participants, query]);

  const handleTogglePlayback = useCallback(() => {
    setIsPlaying((current) => !current);
  }, []);

  const handleLeave = useCallback(() => {
    router.push("/discover");
  }, [router]);

  const handleSend = useCallback(() => {
    const text = messageDraft.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      {
        id: `m_${Date.now()}`,
        sender: session?.user.name ?? "You",
        text,
        isYou: true,
      },
    ]);
    setMessageDraft("");
  }, [messageDraft, session?.user.name]);

  const handleMessageKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleSend();
    },
    [handleSend]
  );

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <AppHeader containerClassName="relative flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <div className="order-1 w-full sm:max-w-[360px]">
          <label htmlFor="participant-search" className="sr-only">
            Search participants
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="participant-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search participants..."
              className="h-12 rounded-full bg-white/75 pr-4 pl-11 shadow-sm backdrop-blur"
            />
          </div>
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
            <div className="space-y-6">
              <Card className="bg-surface/80 border-border/70 flex flex-col rounded-[28px] border shadow-sm backdrop-blur">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-text-strong text-base font-semibold">
                      {roomName}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "flex items-center gap-2",
                        roomDetail.isLive ? "" : "opacity-70"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          roomDetail.isLive
                            ? "bg-accent-warm"
                            : "bg-muted-foreground"
                        )}
                        aria-hidden="true"
                      />
                      {roomDetail.isLive ? "Live" : "Offline"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {participantStats
                      ? `${participantStats.current}/${participantStats.capacity} participants`
                      : `${participants.length} participants`}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="space-y-3">
                    {filteredParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 border border-white/60">
                            <AvatarFallback>
                              {getInitials(participant.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-text-strong truncate text-sm font-semibold">
                              {participant.name}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {participant.role === "host"
                                ? "host"
                                : "listener"}
                            </div>
                          </div>
                        </div>

                        {participant.role === "host" ? (
                          <Badge variant="subtle" className="shrink-0">
                            Host
                          </Badge>
                        ) : participant.isYou ? (
                          <Badge variant="subtle" className="shrink-0">
                            You
                          </Badge>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4">
                    <Button
                      type="button"
                      onClick={handleLeave}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full border-transparent"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Leave
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 rounded-[22px] border bg-white/70 shadow-sm backdrop-blur">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-primary-muted text-primary flex h-10 w-10 items-center justify-center rounded-full">
                      <ListMusic className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-text-strong text-sm font-semibold">
                        Up next
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {upNext ? `${upNext.title} — ${upNext.artist}` : "—"}
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="h-10 px-5">
                    Queue
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <Card className="border-border/70 shrink-0 overflow-hidden rounded-[28px] border bg-white/70 shadow-sm backdrop-blur">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Now playing
                    </div>
                    <div className="text-text-strong truncate text-base font-semibold">
                      {nowPlayingTitle}
                    </div>
                    <div className="text-muted-foreground truncate text-sm">
                      {nowPlayingArtist}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    onClick={handleTogglePlayback}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="bg-foreground/10 h-[84px] rounded-2xl" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">0:58</span>
                      <span className="text-muted-foreground">
                        {formatTime(roomDetail.currentTrack.durationSeconds)}
                      </span>
                    </div>
                    <div className="bg-border h-2 w-full rounded-full">
                      <div className="bg-primary h-2 w-[42%] rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border bg-white/70 shadow-sm backdrop-blur lg:min-h-0 lg:flex-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-text-strong text-base font-semibold">
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-0">
                  <div
                    ref={chatScrollRef}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/60 p-4"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.isYou ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.isYou ? null : (
                          <Avatar className="h-9 w-9 border border-white/60">
                            <AvatarFallback>
                              {getInitials(message.sender)}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                            message.isYou
                              ? "bg-primary text-white"
                              : "text-text-strong bg-white"
                          )}
                        >
                          {message.isYou ? null : (
                            <div className="text-xs font-semibold opacity-70">
                              {message.sender}
                            </div>
                          )}
                          <div>{message.text}</div>
                        </div>

                        {message.isYou ? (
                          <Avatar className="h-9 w-9 border border-white/60">
                            <AvatarFallback>
                              {getInitials(session?.user.name ?? "You")}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end gap-3">
                    <Avatar className="h-10 w-10 border border-white/60">
                      <AvatarFallback>
                        {getInitials(session?.user.name ?? "You")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        value={messageDraft}
                        onChange={(event) =>
                          setMessageDraft(event.target.value)
                        }
                        onKeyDown={handleMessageKeyDown}
                        placeholder="Text Box"
                        className="h-12 rounded-full bg-white/80 px-5 shadow-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleSend}
                      aria-label="Send message"
                      disabled={!messageDraft.trim()}
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
