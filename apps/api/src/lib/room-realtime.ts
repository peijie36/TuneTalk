import type { WSContext } from "hono/ws";

import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import type { RoomRealtimeEvent } from "@tunetalk/shared/room-realtime";

const WS_OPEN_STATE = 1;
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 45_000;
const CHAT_RATE_WINDOW_MS = 10_000;
const CHAT_RATE_MAX = 8;
const rooms = new Map<
  string,
  Map<
    WSContext,
    {
      lastSeenAt: number;
      lastPingAt: number;
      user: { id: string; name: string; role: "host" | "member" };
    }
  >
>();
const chatRateLimits = new Map<
  string,
  { windowStartMs: number; count: number }
>();

function allowChatMessage(roomId: string, userId: string) {
  const now = Date.now();
  const key = `${roomId}:${userId}`;
  const state = chatRateLimits.get(key);
  if (!state || now - state.windowStartMs >= CHAT_RATE_WINDOW_MS) {
    chatRateLimits.set(key, { windowStartMs: now, count: 1 });
    return true;
  }

  if (state.count >= CHAT_RATE_MAX) return false;
  state.count += 1;
  return true;
}

function safeSend(ws: WSContext, event: RoomRealtimeEvent) {
  if (ws.readyState !== WS_OPEN_STATE) return;
  try {
    ws.send(JSON.stringify(event));
  } catch {
    // ignore
  }
}

function getPresence(roomId: string) {
  const connections = rooms.get(roomId);
  if (!connections) return [];

  const deduped = new Map<
    string,
    { id: string; name: string; role: "host" | "member" }
  >();

  for (const { user } of connections.values()) {
    if (!deduped.has(user.id)) deduped.set(user.id, user);
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.role !== b.role) return a.role === "host" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function broadcastPresence(roomId: string) {
  const connections = rooms.get(roomId);
  if (!connections) return;

  const participants = getPresence(roomId);
  for (const ws of connections.keys()) {
    safeSend(ws, { type: "presence", roomId, participants });
  }
}

export function addRoomConnection(
  roomId: string,
  ws: WSContext,
  user: { id: string; name: string; role: "host" | "member" }
) {
  const now = Date.now();
  const connections =
    rooms.get(roomId) ??
    new Map<
      WSContext,
      {
        lastSeenAt: number;
        lastPingAt: number;
        user: { id: string; name: string; role: "host" | "member" };
      }
    >();
  connections.set(ws, { lastSeenAt: now, lastPingAt: 0, user });
  rooms.set(roomId, connections);
  broadcastPresence(roomId);
}

export function removeRoomConnection(roomId: string, ws: WSContext) {
  const connections = rooms.get(roomId);
  if (!connections) return;
  connections.delete(ws);
  if (connections.size === 0) {
    rooms.delete(roomId);
    return;
  }
  broadcastPresence(roomId);
}

export function getRoomPresenceCount(roomId: string) {
  return rooms.get(roomId)?.size ?? 0;
}

export function broadcastRoomDisbanded(roomId: string) {
  const connections = rooms.get(roomId);
  if (!connections) return;

  for (const ws of connections.keys()) {
    safeSend(ws, { type: "room_disbanded", roomId });
    try {
      ws.close(1000, "Room disbanded");
    } catch {
      // ignore
    }
  }

  rooms.delete(roomId);
}

export function handleRoomMessage(
  roomId: string,
  ws: WSContext,
  data: unknown
) {
  if (typeof data !== "string") return;
  const connections = rooms.get(roomId);
  const state = connections?.get(ws);
  if (!state) return;
  if (!connections) return;

  if (data === "pong") {
    state.lastSeenAt = Date.now();
    return;
  }

  if (data === "ping") {
    state.lastSeenAt = Date.now();
    safeSend(ws, { type: "pong" });
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  if (!payload || typeof payload !== "object") return;
  if ((payload as { type?: unknown }).type !== "chat") return;

  const textValue = (payload as { text?: unknown }).text;
  const text = typeof textValue === "string" ? textValue.trim() : "";
  if (!text) return;
  if (text.length > 500) return;

  if (!allowChatMessage(roomId, state.user.id)) {
    safeSend(ws, {
      type: "chat_error",
      roomId,
      error: "You're sending messages too fast. Please slow down.",
    });
    return;
  }

  void (async () => {
    try {
      const inserted = await db
        .insert(schema.roomMessage)
        .values({
          id: `msg_${crypto.randomUUID()}`,
          roomId,
          userId: state.user.id,
          text,
        })
        .returning({
          id: schema.roomMessage.id,
          createdAt: schema.roomMessage.createdAt,
        });

      const row = inserted.at(0);
      const messageId = row?.id ?? `msg_${crypto.randomUUID()}`;
      const createdAt = (row?.createdAt ?? new Date()).toISOString();

      const event: RoomRealtimeEvent = {
        type: "chat",
        roomId,
        id: messageId,
        sender: { id: state.user.id, name: state.user.name },
        text,
        createdAt,
      };

      for (const socket of connections.keys()) {
        safeSend(socket, event);
      }
    } catch {
      safeSend(ws, {
        type: "chat_error",
        roomId,
        error: "Failed to send message. Please try again.",
      });
    }
  })();
}

function startHeartbeatLoop() {
  const globalKey = "__TUNETALK_ROOM_REALTIME_HEARTBEAT__";
  const globalState = globalThis as unknown as Record<string, unknown>;
  if (globalState[globalKey]) return;

  globalState[globalKey] = setInterval(() => {
    const now = Date.now();

    for (const [roomId, connections] of rooms) {
      for (const [ws, state] of connections) {
        if (ws.readyState !== WS_OPEN_STATE) {
          connections.delete(ws);
          continue;
        }

        if (now - state.lastSeenAt > STALE_AFTER_MS) {
          try {
            ws.close(1000, "Stale connection");
          } catch {
            // ignore
          }
          connections.delete(ws);
          continue;
        }

        if (now - state.lastPingAt >= HEARTBEAT_INTERVAL_MS) {
          state.lastPingAt = now;
          safeSend(ws, { type: "ping" });
        }
      }

      if (connections.size === 0) rooms.delete(roomId);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

startHeartbeatLoop();
