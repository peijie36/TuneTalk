"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RoomWebSocketStatus } from "@/hooks/room-realtime-types";
import { API_BASE_URL } from "@/lib/constants";
import { toWebSocketUrl } from "@/utils/room-realtime-utils";

function getBootstrapState({
  enabled,
  sessionUserId,
  accessDeniedReason,
}: {
  enabled: boolean;
  sessionUserId: string | null;
  accessDeniedReason: string | null;
}) {
  if (!enabled) {
    return {
      status: "disconnected" as const,
      detail: "Room not ready.",
    };
  }

  if (!sessionUserId) {
    return {
      status: "disconnected" as const,
      detail: "Sign in to connect.",
    };
  }

  if (!navigator.onLine) {
    return {
      status: "offline" as const,
      detail: "You're offline.",
    };
  }

  if (accessDeniedReason) {
    return {
      status: "disconnected" as const,
      detail: accessDeniedReason,
    };
  }

  return null;
}

function getReconnectDelay(attempt: number) {
  const baseDelay = Math.min(15_000, 500 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  return baseDelay + jitter;
}

interface UseRoomWebSocketBootstrapOptions {
  roomId: string;
  enabled: boolean;
  sessionUserId: string | null;
  onMessage: (data: string, ws: WebSocket) => void;
  onDisconnected: () => void;
  onAccessDenied?: (reason: string) => void;
}

export function useRoomWebSocketBootstrap({
  roomId,
  enabled,
  sessionUserId,
  onMessage,
  onDisconnected,
  onAccessDenied,
}: UseRoomWebSocketBootstrapOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const accessDeniedReasonRef = useRef<string | null>(null);

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

      onDisconnected();
      setWsStatus("disconnected");
      setWsStatusDetail(reason ?? null);
    },
    [clearReconnectTimer, onDisconnected]
  );

  const markOffline = useCallback(() => {
    clearReconnectTimer();
    setWsStatus("offline");
    setWsStatusDetail("You're offline.");
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    const bootstrapState = getBootstrapState({
      enabled,
      sessionUserId,
      accessDeniedReason: accessDeniedReasonRef.current,
    });

    if (bootstrapState) {
      setWsStatus(bootstrapState.status);
      setWsStatusDetail(bootstrapState.detail);
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
      accessDeniedReasonRef.current = null;
      reconnectAttemptRef.current = 0;
      setWsStatus("connected");
      setWsStatusDetail(null);
    });

    ws.addEventListener("message", (event) => {
      if (wsRef.current !== ws) return;
      if (typeof event.data !== "string") return;
      onMessage(event.data, ws);
    });

    ws.addEventListener("close", (event) => {
      if (wsRef.current !== ws) return;

      wsRef.current = null;
      onDisconnected();

      if (event.code === 1008) {
        const reason = event.reason || "Room access required.";
        accessDeniedReasonRef.current = reason;
        setWsStatus("disconnected");
        setWsStatusDetail(reason);
        onAccessDenied?.(reason);
        return;
      }

      if (!navigator.onLine) {
        markOffline();
        return;
      }

      setWsStatus("disconnected");
      setWsStatusDetail(event.reason || "Disconnected. Reconnecting...");

      if (!enabled || !sessionUserId) return;

      const attempt = reconnectAttemptRef.current;
      reconnectAttemptRef.current = Math.min(attempt + 1, 6);

      clearReconnectTimer();
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!enabled || !sessionUserId) return;
        if (wsRef.current) return;
        connect();
      }, getReconnectDelay(attempt));
    });

    ws.addEventListener("error", () => {
      if (wsRef.current !== ws) return;
      setWsStatus("disconnected");
      setWsStatusDetail("Connection error. Reconnecting...");
    });
  }, [
    clearReconnectTimer,
    enabled,
    markOffline,
    onAccessDenied,
    onDisconnected,
    onMessage,
    roomId,
    sessionUserId,
  ]);

  useEffect(() => {
    accessDeniedReasonRef.current = null;

    if (!wsRef.current) return;
    disconnect("Switching rooms.");
  }, [disconnect, roomId]);

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
      markOffline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [connect, enabled, markOffline, sessionUserId]);

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
    wsRef,
    wsStatus,
    wsStatusDetail,
    disconnect,
    markOffline,
  };
}
