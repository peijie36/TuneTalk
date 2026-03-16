"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { RoomPresenceParticipant } from "@tunetalk/shared/room-realtime";
import type { RoomPlaybackState, RoomQueueItem } from "@tunetalk/shared/rooms";

import type { SendChatResult } from "@/hooks/room-realtime-types";
import { useRoomWebSocketBootstrap } from "@/hooks/use-room-websocket-bootstrap";
import {
  addRoomQueueItem,
  getRoomAccessRequiredChatError,
  insertRoomMessagePage,
  removeRoomQueueItems,
  toRoomChatMessage,
} from "@/utils/room-realtime-event-helpers";
import {
  type RoomMessagesPage,
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

      switch (parsed.type) {
        case "ping":
          try {
            ws.send("pong");
          } catch {
            // ignore
          }
          return;

        case "room_disbanded":
          if (parsed.roomId !== roomId) return;
          onRoomDisbanded?.();
          void queryClient.invalidateQueries({ queryKey: ["rooms"] });
          router.replace("/discover?toast=disbanded");
          return;

        case "presence":
          if (parsed.roomId !== roomId) return;
          setParticipants(parsed.participants);
          return;

        case "chat_error":
          if (parsed.roomId !== roomId) return;
          onChatError?.(parsed.error);
          onAnnouncement?.(parsed.error);
          return;

        case "playback_state":
          if (parsed.roomId !== roomId) return;
          setPlaybackState(parsed.playback);
          return;

        case "queue_state":
          if (parsed.roomId !== roomId) return;
          setQueueState(parsed.queue);
          return;

        case "queue_item_added":
          if (parsed.roomId !== roomId) return;
          setQueueState((current) => addRoomQueueItem(current, parsed.item));
          return;

        case "queue_items_removed":
          if (parsed.roomId !== roomId) return;
          setQueueState((current) =>
            removeRoomQueueItems(current, parsed.itemIds)
          );
          return;

        case "chat":
          if (parsed.roomId !== roomId) return;

          if (parsed.sender.id !== sessionUserId) {
            onAnnouncement?.(`New message from ${parsed.sender.name}.`);
          }

          queryClient.setQueryData<InfiniteData<RoomMessagesPage>>(
            ["roomMessages", roomId],
            (current) =>
              insertRoomMessagePage(
                current,
                toRoomChatMessage({
                  id: parsed.id,
                  sender: parsed.sender,
                  text: parsed.text,
                  createdAt: parsed.createdAt,
                })
              )
          );
          return;

        case "pong":
          return;
      }
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
      onChatError?.(getRoomAccessRequiredChatError(reason));
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
