"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type {
  RoomChatMessage,
  RoomPresenceParticipant,
} from "@tunetalk/shared/room-realtime";
import type { RoomPlaybackState, RoomQueueItem } from "@tunetalk/shared/rooms";

import type { SendChatResult } from "@/hooks/room-realtime-types";
import { useRoomWebSocketBootstrap } from "@/hooks/use-room-websocket-bootstrap";
import {
  type RoomMessagesPage,
  insertRoomMessage,
  parseWsEvent,
} from "@/utils/room-realtime-utils";

export function useRoomRealtime({
  roomId,
  enabled,
  sessionUserId,
  onChatError,
  onAnnouncement,
  onAccessRequired,
  onRoomDisbanded,
}: {
  roomId: string;
  enabled: boolean;
  sessionUserId: string | null;
  onChatError?: (message: string) => void;
  onAnnouncement?: (message: string) => void;
  onAccessRequired?: (reason: string) => void;
  onRoomDisbanded?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [participants, setParticipants] = useState<RoomPresenceParticipant[]>(
    []
  );
  const [playbackState, setPlaybackState] = useState<RoomPlaybackState | null>(
    null
  );
  const [queueState, setQueueState] = useState<RoomQueueItem[] | null>(null);

  const handleSocketDisconnected = useCallback(() => {
    setParticipants([]);
    setQueueState(null);
  }, []);

  const handleSocketMessage = useCallback(
    (data: string, ws: WebSocket) => {
      const parsed = parseWsEvent(data);
      if (!parsed) return;

      if (parsed.type === "ping") {
        try {
          ws.send("pong");
        } catch {
          // ignore
        }
        return;
      }

      if (parsed.type === "room_disbanded" && parsed.roomId === roomId) {
        onRoomDisbanded?.();
        void queryClient.invalidateQueries({ queryKey: ["rooms"] });
        router.replace("/discover?toast=disbanded");
        return;
      }

      if (parsed.type === "presence" && parsed.roomId === roomId) {
        setParticipants(parsed.participants);
        return;
      }

      if (parsed.type === "chat_error" && parsed.roomId === roomId) {
        onChatError?.(parsed.error);
        onAnnouncement?.(parsed.error);
        return;
      }

      if (parsed.type === "playback_state" && parsed.roomId === roomId) {
        setPlaybackState(parsed.playback);
        return;
      }

      if (parsed.type === "queue_state" && parsed.roomId === roomId) {
        setQueueState(parsed.queue);
        return;
      }

      if (parsed.type === "queue_item_added" && parsed.roomId === roomId) {
        setQueueState((current) => {
          if (!current) return [parsed.item];
          if (current.some((item) => item.id === parsed.item.id)) {
            return current;
          }

          return [...current, parsed.item].sort(
            (a, b) => a.position - b.position
          );
        });
        return;
      }

      if (parsed.type === "queue_items_removed" && parsed.roomId === roomId) {
        setQueueState((current) => {
          if (!current) return current;
          if (parsed.itemIds.length === 0) return current;

          const removedIds = new Set(parsed.itemIds);
          return current.filter((item) => !removedIds.has(item.id));
        });
        return;
      }

      if (parsed.type !== "chat" || parsed.roomId !== roomId) return;

      if (parsed.sender.id !== sessionUserId) {
        onAnnouncement?.(`New message from ${parsed.sender.name}.`);
      }

      const message: RoomChatMessage = {
        id: parsed.id,
        sender: parsed.sender,
        text: parsed.text,
        createdAt: parsed.createdAt,
      };

      queryClient.setQueryData<InfiniteData<RoomMessagesPage>>(
        ["roomMessages", roomId],
        (current) => {
          const base =
            current ??
            ({
              pages: [{ messages: [], nextCursor: null }],
              pageParams: [undefined],
            } satisfies InfiniteData<RoomMessagesPage>);

          const nextPages =
            base.pages.length > 0
              ? [...base.pages]
              : [{ messages: [], nextCursor: null }];

          const firstPage = nextPages[0];
          if (firstPage.messages.some((item) => item.id === message.id)) {
            return base;
          }

          nextPages[0] = {
            ...firstPage,
            messages: insertRoomMessage(firstPage.messages, message),
          };

          return { ...base, pages: nextPages };
        }
      );
    },
    [
      onAnnouncement,
      onChatError,
      onRoomDisbanded,
      queryClient,
      roomId,
      router,
      sessionUserId,
    ]
  );

  const handleSocketAccessDenied = useCallback(
    (reason: string) => {
      onChatError?.(
        reason === "Join room before connecting"
          ? "Join the room from Discover first."
          : "Room access required. Join again to chat."
      );
      onAccessRequired?.(reason);
    },
    [onAccessRequired, onChatError]
  );

  const { wsRef, wsStatus, wsStatusDetail, markOffline } =
    useRoomWebSocketBootstrap({
      roomId,
      enabled,
      sessionUserId,
      onMessage: handleSocketMessage,
      onDisconnected: handleSocketDisconnected,
      onAccessDenied: handleSocketAccessDenied,
    });

  const sendChat = useCallback(
    (text: string): SendChatResult => {
      const value = text.trim();
      if (!value) return { ok: false, error: "Message is empty." };
      if (!sessionUserId) return { ok: false, error: "Sign in to chat." };
      if (!enabled) return { ok: false, error: "Room not ready." };

      if (!navigator.onLine) {
        markOffline();
        return { ok: false, error: "You're offline." };
      }

      const ws = wsRef.current;
      if (ws?.readyState !== 1) {
        return { ok: false, error: "Connect to realtime chat first." };
      }

      try {
        ws.send(JSON.stringify({ type: "chat", text: value }));
        return { ok: true };
      } catch {
        return { ok: false, error: "Failed to send message." };
      }
    },
    [enabled, markOffline, sessionUserId, wsRef]
  );

  useEffect(() => {
    setParticipants([]);
    setQueueState(null);
    setPlaybackState(null);
  }, [roomId]);

  return {
    participants,
    wsStatus,
    wsStatusDetail,
    sendChat,
    isConnected: wsStatus === "connected",
    playbackState,
    queueState,
  };
}
