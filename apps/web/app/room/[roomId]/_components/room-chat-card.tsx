"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Send } from "lucide-react";

import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  RoomWebSocketStatus,
  SendChatResult,
} from "@/hooks/room-realtime-types";
import { useRoomChatListState } from "@/hooks/use-room-chat-list-state";
import { useRoomMessages } from "@/hooks/use-room-messages";
import { cn } from "@/utils/cn";
import { formatMessageTime } from "@/utils/room-realtime-utils";
import { getInitials } from "@/utils/string-utils";

function ChatHeader() {
  return (
    <CardHeader className="px-4 pt-4 pb-2">
      <CardTitle className="text-text-strong text-base font-semibold">
        Chat
      </CardTitle>
    </CardHeader>
  );
}

function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-border/70 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border bg-white/70 shadow-sm backdrop-blur">
      <ChatHeader />
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-0 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

function ChatAvatar({ name }: { name: string }) {
  return (
    <Avatar className="h-9 w-9 border border-white/60">
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

const ChatMessageRow = memo(function ChatMessageRow({
  index,
  start,
  measureElement,
  message,
  sessionUserId,
}: {
  index: number;
  start: number;
  measureElement: (node: Element | null) => void;
  message: RoomChatMessage;
  sessionUserId: string | null;
}) {
  const isYou = message.sender.id === sessionUserId;
  const senderName = isYou ? "You" : message.sender.name;
  const avatarLabel = message.sender.name;
  const timeLabel = formatMessageTime(message.createdAt);

  return (
    <div
      data-index={index}
      ref={measureElement}
      className="absolute top-0 left-0 w-full py-1"
      style={{ transform: `translateY(${start}px)` }}
    >
      <div
        className={cn(
          "flex w-full items-end gap-2",
          isYou ? "justify-end" : "justify-start"
        )}
      >
        {!isYou ? <ChatAvatar name={avatarLabel} /> : null}

        <div
          className={cn(
            "flex max-w-[78%] flex-col gap-1 sm:max-w-[70%]",
            isYou ? "items-end text-right" : "items-start"
          )}
        >
          <div className="text-muted-foreground flex items-center gap-2 px-1 text-xs font-semibold">
            <span>{senderName}</span>
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

        {isYou ? <ChatAvatar name={avatarLabel} /> : null}
      </div>
    </div>
  );
});

const ChatMessageList = memo(function ChatMessageList({
  sessionUserId,
  wsStatus,
  liveAnnouncement,
  messages,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  fetchNextPage,
}: {
  sessionUserId: string | null;
  wsStatus: RoomWebSocketStatus;
  liveAnnouncement: string;
  messages: RoomChatMessage[];
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  const {
    chatScrollRef,
    chatVirtualizer,
    unreadCount,
    handleChatScroll,
    handleJumpToLatest,
    handleLoadOlder,
  } = useRoomChatListState({
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    wsStatus,
  });

  const statusNotice = !sessionUserId
    ? "Sign in to chat. Messages are still visible."
    : wsStatus !== "connected"
      ? "Connecting to realtime chat..."
      : null;
  const emptyStateText = isFetching
    ? "Loading messages..."
    : "No messages yet. Say hello!";

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </div>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleLoadOlder()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load older messages"}
          </Button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={chatScrollRef}
          className="border-border/70 tt-scrollbar-hidden h-full min-h-0 overflow-y-auto rounded-2xl border bg-white/80 p-3 shadow-inner"
          onScroll={handleChatScroll}
        >
          {statusNotice ? (
            <div className="text-muted-foreground text-sm">{statusNotice}</div>
          ) : null}

          {messages.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              {emptyStateText}
            </div>
          ) : (
            <div
              className="relative w-full"
              style={{ height: chatVirtualizer.getTotalSize() }}
            >
              {chatVirtualizer.getVirtualItems().map((item) => (
                <ChatMessageRow
                  key={item.key}
                  index={item.index}
                  start={item.start}
                  measureElement={chatVirtualizer.measureElement}
                  message={messages[item.index]}
                  sessionUserId={sessionUserId}
                />
              ))}
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
});

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

function ChatCallout({
  title,
  description,
  detail,
  children,
}: {
  title: string;
  description: string;
  detail?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/30 bg-white/15 p-4">
      <p className="text-text-strong text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {detail ? (
        <p className="text-muted-foreground text-xs">{detail}</p>
      ) : null}
    </div>
  );
}

interface RoomChatCardProps {
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
}: RoomChatCardProps) {
  const router = useRouter();
  const messagesQuery = useRoomMessages(roomId, roomReady);
  const canSendChat = !!sessionUserId && wsStatus === "connected" && roomReady;

  useEffect(() => {
    if (!chatError) return;
    const timeout = window.setTimeout(() => setChatError(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [chatError, setChatError]);

  useEffect(() => {
    if (wsStatus === "connected") setChatError(null);
  }, [setChatError, wsStatus]);

  if (isRoomNotFound) {
    return (
      <ChatShell>
        <ChatCallout
          title="Room not found"
          description="This room may have been disbanded or the link is incorrect."
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.replace("/discover")}
          >
            Back to Discover
          </Button>
        </ChatCallout>
      </ChatShell>
    );
  }

  if (requiresRoomAccess && !roomReady) {
    return (
      <ChatShell>
        <ChatCallout
          title="Private room"
          description="Sign in, then enter the room password to join."
          detail={roomApiErrorMessage}
        >
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
        </ChatCallout>
      </ChatShell>
    );
  }

  return (
    <ChatShell>
      <ChatMessageList
        sessionUserId={sessionUserId}
        wsStatus={wsStatus}
        liveAnnouncement={liveAnnouncement}
        messages={messagesQuery.messages}
        hasNextPage={Boolean(messagesQuery.hasNextPage)}
        isFetching={messagesQuery.isFetching}
        isFetchingNextPage={messagesQuery.isFetchingNextPage}
        fetchNextPage={messagesQuery.fetchNextPage}
      />

      {chatError ? (
        <p className="text-destructive text-sm font-medium">{chatError}</p>
      ) : null}

      <ChatComposer
        sessionUserId={sessionUserId}
        wsStatus={wsStatus}
        canSendChat={canSendChat}
        sendChat={sendChat}
        onChatError={setChatError}
      />

      {wsStatusDetail && wsStatus !== "connected" ? (
        <p className="text-muted-foreground text-xs">{wsStatusDetail}</p>
      ) : null}
    </ChatShell>
  );
}
