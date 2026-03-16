export type RoomWebSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "offline"
  | "disconnected";

export type SendChatResult = { ok: true } | { ok: false; error: string };
