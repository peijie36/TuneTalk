"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  RoomChatMessage,
  RoomPresenceParticipant,
} from "@tunetalk/shared/room-realtime";

import { API_BASE_URL } from "@/lib/constants";

import {
  type RoomMessagesPage,
  insertRoomMessage,
  parseWsEvent,
  toWebSocketUrl,
} from "@/utils/room-realtime-utils";

export type RoomWebSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "offline"
  | "disconnected";

export type SendChatResult = { ok: true } | { ok: false; error: string };

export function useRoomRealtime({
  roomId,
  enabled,
  sessionUserId,
  onChatError,
  onAnnouncement,
  onAccessRequired,
}: {
  roomId: string;
  enabled: boolean;
  sessionUserId: string | null;
  onChatError?: (message: string) => void;
  onAnnouncement?: (message: string) => void;
  onAccessRequired?: (reason: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const [participants, setParticipants] = useState<RoomPresenceParticipant[]>(
    []
  );
  const [wsStatus, setWsStatus] = useState<RoomWebSocketStatus>("idle");
  const [wsStatusDetail, setWsStatusDetail] = useState<string | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current === null) return;
    window.clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }, []);

  const disconnect = useCallback(
    (reason?: string) => {
      clearReconnectTimer();
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        try {
          ws.close(1000, reason ?? "Disconnect");
        } catch {
          // ignore
        }
      }

      setParticipants([]);
      setWsStatus("disconnected");
      setWsStatusDetail(reason ?? null);
    },
    [clearReconnectTimer]
  );

  const connect = useCallback(() => {
    if (!enabled) {
      setWsStatus("disconnected");
      setWsStatusDetail("Room not ready.");
      return;
    }

    if (!sessionUserId) {
      setWsStatus("disconnected");
      setWsStatusDetail("Sign in to connect.");
      return;
    }

    if (!navigator.onLine) {
      setWsStatus("offline");
      setWsStatusDetail("You're offline.");
      return;
    }

    clearReconnectTimer();

    const existing = wsRef.current;
    if (existing) {
      wsRef.current = null;
      try {
        existing.close(1000, "Reconnecting");
      } catch {
        // ignore
      }
    }

    const url = `${toWebSocketUrl(API_BASE_URL)}/api/rooms/${encodeURIComponent(roomId)}/ws`;
    setWsStatus("connecting");
    setWsStatusDetail(null);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      if (wsRef.current !== ws) return;
      reconnectAttemptRef.current = 0;
      setWsStatus("connected");
      setWsStatusDetail(null);
    });

    ws.addEventListener("message", (event) => {
      if (wsRef.current !== ws) return;
      if (typeof event.data !== "string") return;

      const parsed = parseWsEvent(event.data);
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

      if (parsed.type === "chat" && parsed.roomId === roomId) {
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

            const nextPages = base.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== message.id),
            }));

            if (nextPages.length === 0) {
              nextPages.push({ messages: [], nextCursor: null });
            }

            nextPages[0] = {
              ...nextPages[0],
              messages: insertRoomMessage(nextPages[0].messages, message),
            };

            return { ...base, pages: nextPages };
          }
        );
      }
    });

    ws.addEventListener("close", (event) => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      setParticipants([]);

      if (event.code === 1008) {
        const reason = event.reason || "Room access required.";
        setWsStatus("disconnected");
        setWsStatusDetail(reason);
        onChatError?.(
          reason === "Join room before connecting"
            ? "Join the room from Discover first."
            : "Room access required. Join again to chat."
        );
        onAccessRequired?.(reason);
        return;
      }

      if (!navigator.onLine) {
        setWsStatus("offline");
        setWsStatusDetail("You're offline.");
        return;
      }

      setWsStatus("disconnected");
      setWsStatusDetail(event.reason || "Disconnected. Reconnecting...");

      if (!enabled || !sessionUserId) return;
      const attempt = reconnectAttemptRef.current;
      const baseDelay = Math.min(15_000, 500 * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 250);
      const delay = baseDelay + jitter;
      reconnectAttemptRef.current = Math.min(attempt + 1, 6);

      clearReconnectTimer();
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!enabled || !sessionUserId) return;
        if (wsRef.current) return;
        connect();
      }, delay);
    });

    ws.addEventListener("error", () => {
      if (wsRef.current !== ws) return;
      setWsStatus("disconnected");
      setWsStatusDetail("Connection error. Reconnecting...");
    });
  }, [
    clearReconnectTimer,
    enabled,
    onAccessRequired,
    onAnnouncement,
    onChatError,
    queryClient,
    roomId,
    router,
    sessionUserId,
  ]);

  const sendChat = useCallback(
    (text: string): SendChatResult => {
      const value = text.trim();
      if (!value) return { ok: false, error: "Message is empty." };
      if (!sessionUserId) return { ok: false, error: "Sign in to chat." };
      if (!enabled) return { ok: false, error: "Room not ready." };

      if (!navigator.onLine) {
        setWsStatus("offline");
        setWsStatusDetail("You're offline.");
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
    [enabled, sessionUserId]
  );

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) disconnect("Room unavailable.");
      return;
    }

    if (!sessionUserId) {
      if (wsRef.current) disconnect("Signed out.");
      return;
    }

    if (wsRef.current) return;
    connect();
  }, [connect, disconnect, enabled, sessionUserId]);

  useEffect(() => {
    if (!enabled || !sessionUserId) return;

    const handleOnline = () => {
      if (!enabled || !sessionUserId) return;
      if (wsRef.current) return;
      connect();
    };

    const handleOffline = () => {
      clearReconnectTimer();
      setWsStatus("offline");
      setWsStatusDetail("You're offline.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [clearReconnectTimer, connect, enabled, sessionUserId]);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      const ws = wsRef.current;
      wsRef.current = null;
      if (!ws) return;
      try {
        ws.close(1000, "Leaving room");
      } catch {
        // ignore
      }
    };
  }, [clearReconnectTimer]);

  return {
    participants,
    wsStatus,
    wsStatusDetail,
    sendChat,
    isConnected: wsStatus === "connected",
  };
}
