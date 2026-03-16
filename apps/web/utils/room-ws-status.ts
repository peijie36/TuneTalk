import type { RoomWebSocketStatus } from "@/hooks/room-realtime-types";

export function getRoomWsStatusDotClass(
  wsStatus: RoomWebSocketStatus,
  sessionUserId: string | null
) {
  if (!sessionUserId) return "bg-muted-foreground/50";
  if (wsStatus === "connected") return "bg-emerald-500";
  if (wsStatus === "offline") return "bg-amber-500";
  if (wsStatus === "disconnected") return "bg-rose-500";
  if (wsStatus === "connecting") return "bg-sky-500";
  return "bg-muted-foreground/50";
}

export function getRoomWsStatusLabel(
  wsStatus: RoomWebSocketStatus,
  sessionUserId: string | null
) {
  if (!sessionUserId) return "Sign in to connect";
  if (wsStatus === "connected") return "Connected";
  if (wsStatus === "connecting") return "Connecting...";
  if (wsStatus === "offline") return "Offline";
  if (wsStatus === "disconnected") return "Disconnected";
  return "Not connected";
}
