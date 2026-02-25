"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Send } from "lucide-react";

import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRoomMessages } from "@/hooks/use-room-messages";
import type {
  RoomWebSocketStatus,
  SendChatResult,
} from "@/hooks/use-room-realtime";
import { cn } from "@/utils/cn";
import { mergeRoomMessagePages } from "@/utils/room-messages";
import { formatMessageTime, isNearBottom } from "@/utils/room-realtime-utils";
import {
  getRoomWsStatusDotClass,
  getRoomWsStatusLabel,
} from "@/utils/room-ws-status";
import { getInitials } from "@/utils/string-utils";

type RoomMessagesQuery = ReturnType<typeof useRoomMessages>;

function ChatHeader({
  sessionUserId,
  wsStatus,
}: {
  sessionUserId: string | null;
  wsStatus: RoomWebSocketStatus;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
      <CardTitle className="text-text-strong text-base font-semibold">
        Chat
      </CardTitle>
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              getRoomWsStatusDotClass(wsStatus, sessionUserId)
            )}
            aria-hidden="true"
          />
          <span>{getRoomWsStatusLabel(wsStatus, sessionUserId)}</span>
        </div>
      </div>
    </CardHeader>
  );
}

function ChatMessageList({
  sessionUserId,
  wsStatus,
  liveAnnouncement,
  messagesQuery,
  messages,
}: {
  sessionUserId: string | null;
  wsStatus: RoomWebSocketStatus;
  liveAnnouncement: string;
  messagesQuery: RoomMessagesQuery;
  messages: RoomChatMessage[];
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const chatVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => chatScrollRef.current,
    estimateSize: () => 104,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    if (!shouldStickToBottomRef.current && !isNearBottom(el)) return;
    shouldStickToBottomRef.current = true;

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [messages.length]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (messages.length <= prev) return;
    if (shouldStickToBottomRef.current) {
      setUnreadCount(0);
      return;
    }

    setUnreadCount((count) => count + (messages.length - prev));
  }, [messages.length]);

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    shouldStickToBottomRef.current = isNearBottom(el);
    if (shouldStickToBottomRef.current) setUnreadCount(0);
  }, []);

  const handleLoadOlder = useCallback(async () => {
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
    const el = chatScrollRef.current;
    if (!el) {
      await messagesQuery.fetchNextPage();
      return;
    }

    shouldStickToBottomRef.current = false;

    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    await messagesQuery.fetchNextPage();

    requestAnimationFrame(() => {
      const nextScrollHeight = el.scrollHeight;
      el.scrollTop = prevScrollTop + (nextScrollHeight - prevScrollHeight);
    });
  }, [
    messagesQuery.fetchNextPage,
    messagesQuery.hasNextPage,
    messagesQuery.isFetchingNextPage,
  ]);

  const handleJumpToLatest = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    shouldStickToBottomRef.current = true;
    setUnreadCount(0);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (wsStatus !== "connected") return;
    shouldStickToBottomRef.current = true;
    setUnreadCount(0);
  }, [wsStatus]);

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </div>

      {messagesQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleLoadOlder()}
            disabled={messagesQuery.isFetchingNextPage}
          >
            {messagesQuery.isFetchingNextPage
              ? "Loading..."
              : "Load older messages"}
          </Button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={chatScrollRef}
          className="border-border/70 tt-scrollbar-hidden h-full min-h-0 overflow-y-auto rounded-2xl border bg-white/80 p-4 shadow-inner"
          onScroll={handleChatScroll}
        >
          {!sessionUserId ? (
            <div className="text-muted-foreground text-sm">
              Sign in to chat (messages are visible).
            </div>
          ) : wsStatus !== "connected" ? (
            <div className="text-muted-foreground text-sm">
              Connecting to realtime chat...
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              {messagesQuery.isFetching
                ? "Loading messages..."
                : "No messages yet. Say hello!"}
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{ height: chatVirtualizer.getTotalSize() }}
            >
              {chatVirtualizer.getVirtualItems().map((item) => {
                const message = messages[item.index];
                const isYou = message.sender.id === sessionUserId;
                const avatarLabel = message.sender.name;
                const timeLabel = formatMessageTime(message.createdAt);

                return (
                  <div
                    key={item.key}
                    data-index={item.index}
                    ref={chatVirtualizer.measureElement}
                    className="absolute top-0 left-0 w-full py-1"
                    style={{ transform: `translateY(${item.start}px)` }}
                  >
                    <div
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
                        <div className="text-muted-foreground flex items-center gap-2 px-1 text-xs font-semibold">
                          <span>{isYou ? "You" : message.sender.name}</span>
                          {timeLabel ? (
                            <span className="text-muted-foreground/80 font-medium">
                              {timeLabel}
                            </span>
                          ) : null}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {unreadCount > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto shadow-md"
              onClick={handleJumpToLatest}
            >
              {unreadCount} new {unreadCount === 1 ? "message" : "messages"} -
              Jump to latest
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ChatComposer({
  sessionUserId,
  wsStatus,
  canSendChat,
  sendChat,
  onChatError,
}: {
  sessionUserId: string | null;
  wsStatus: RoomWebSocketStatus;
  canSendChat: boolean;
  sendChat: (text: string) => SendChatResult;
  onChatError: (message: string) => void;
}) {
  const [messageDraft, setMessageDraft] = useState("");
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = useCallback(() => {
    const text = messageDraft.trim();
    if (!text) return;

    const result = sendChat(text);
    if (!result.ok) {
      onChatError(result.error);
      return;
    }

    setMessageDraft("");
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }, [messageDraft, onChatError, sendChat]);

  const handleMessageKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleSend();
    },
    [handleSend]
  );

  useEffect(() => {
    if (!canSendChat) return;
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }, [canSendChat]);

  const chatPlaceholder = !sessionUserId
    ? "Sign in to chat"
    : wsStatus === "connected"
      ? "Send a message..."
      : wsStatus === "offline"
        ? "You're offline"
        : "Connecting...";

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={chatInputRef}
        value={messageDraft}
        onChange={(event) => setMessageDraft(event.target.value)}
        onKeyDown={handleMessageKeyDown}
        placeholder={chatPlaceholder}
        aria-label="Message"
        className="h-12 rounded-full bg-white/90 shadow-sm backdrop-blur"
        disabled={!canSendChat}
      />
      <Button
        type="button"
        className="h-13 w-13 rounded-full"
        onClick={handleSend}
        disabled={!canSendChat || !messageDraft.trim()}
      >
        <Send aria-hidden="true" />
      </Button>
    </div>
  );
}

export default function RoomChatCard({
  roomId,
  roomReady,
  isRoomNotFound,
  requiresRoomAccess,
  roomApiErrorMessage,
  sessionUserId,
  wsStatus,
  wsStatusDetail,
  sendChat,
  chatError,
  setChatError,
  liveAnnouncement,
}: {
  roomId: string;
  roomReady: boolean;
  isRoomNotFound: boolean;
  requiresRoomAccess: boolean;
  roomApiErrorMessage: string | null;
  sessionUserId: string | null;
  wsStatus: RoomWebSocketStatus;
  wsStatusDetail: string | null;
  sendChat: (text: string) => SendChatResult;
  chatError: string | null;
  setChatError: (value: string | null) => void;
  liveAnnouncement: string;
}) {
  const router = useRouter();

  const messagesQuery = useRoomMessages(roomId, roomReady);
  const messages = useMemo(() => {
    return mergeRoomMessagePages(messagesQuery.data?.pages ?? []);
  }, [messagesQuery.data]);

  const canSendChat = !!sessionUserId && wsStatus === "connected" && roomReady;

  useEffect(() => {
    if (!chatError) return;
    const timeout = window.setTimeout(() => setChatError(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [chatError, setChatError]);

  useEffect(() => {
    if (wsStatus !== "connected") return;
    setChatError(null);
  }, [setChatError, wsStatus]);

  return (
    <Card className="border-border/70 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border bg-white/70 shadow-sm backdrop-blur">
      <ChatHeader sessionUserId={sessionUserId} wsStatus={wsStatus} />

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
        {isRoomNotFound ? (
          <div className="space-y-3 rounded-2xl border border-white/30 bg-white/15 p-4">
            <p className="text-text-strong text-sm font-semibold">
              Room not found
            </p>
            <p className="text-muted-foreground text-sm">
              This room may have been disbanded or the link is incorrect.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.replace("/discover")}
              >
                Back to Discover
              </Button>
            </div>
          </div>
        ) : requiresRoomAccess && !roomReady ? (
          <div className="space-y-3 rounded-2xl border border-white/30 bg-white/15 p-4">
            <p className="text-text-strong text-sm font-semibold">
              Private room
            </p>
            <p className="text-muted-foreground text-sm">
              Sign in, then enter the room password to join.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!sessionUserId ? (
                <p className="text-muted-foreground text-sm">
                  Sign in using the header.
                </p>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    router.replace("/discover?toast=password_required")
                  }
                >
                  Go to Discover to join
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.replace("/discover")}
              >
                Back to Discover
              </Button>
            </div>
            {roomApiErrorMessage ? (
              <p className="text-muted-foreground text-xs">
                {roomApiErrorMessage}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <ChatMessageList
              sessionUserId={sessionUserId}
              wsStatus={wsStatus}
              liveAnnouncement={liveAnnouncement}
              messagesQuery={messagesQuery}
              messages={messages}
            />

            {chatError ? (
              <p className="text-destructive text-sm font-medium">
                {chatError}
              </p>
            ) : null}

            <ChatComposer
              sessionUserId={sessionUserId}
              wsStatus={wsStatus}
              canSendChat={canSendChat}
              sendChat={sendChat}
              onChatError={(message) => setChatError(message)}
            />

            {wsStatusDetail && wsStatus !== "connected" ? (
              <p className="text-muted-foreground text-xs">{wsStatusDetail}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
