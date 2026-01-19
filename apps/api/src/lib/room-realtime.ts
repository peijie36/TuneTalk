import type { WSContext } from "hono/ws";

type RoomEvent =
  | { type: "room_disbanded"; roomId: string }
  | { type: "ping" }
  | { type: "pong" };

const WS_OPEN_STATE = 1;
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 45_000;
const rooms = new Map<
  string,
  Map<WSContext, { lastSeenAt: number; lastPingAt: number }>
>();

function safeSend(ws: WSContext, event: RoomEvent) {
  if (ws.readyState !== WS_OPEN_STATE) return;
  try {
    ws.send(JSON.stringify(event));
  } catch {
    // ignore
  }
}

export function addRoomConnection(roomId: string, ws: WSContext) {
  const now = Date.now();
  const connections =
    rooms.get(roomId) ??
    new Map<WSContext, { lastSeenAt: number; lastPingAt: number }>();
  connections.set(ws, { lastSeenAt: now, lastPingAt: 0 });
  rooms.set(roomId, connections);
}

export function removeRoomConnection(roomId: string, ws: WSContext) {
  const connections = rooms.get(roomId);
  if (!connections) return;
  connections.delete(ws);
  if (connections.size === 0) rooms.delete(roomId);
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

  if (data === "pong") {
    state.lastSeenAt = Date.now();
    return;
  }

  if (data === "ping") {
    state.lastSeenAt = Date.now();
    safeSend(ws, { type: "pong" });
  }
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
