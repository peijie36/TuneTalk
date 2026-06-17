import type { RoomVisibility } from "@tunetalk/shared/rooms";

export function coerceLimit(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

export function parseRoomVisibility(
  value: string | undefined
): RoomVisibility | null {
  if (value === "public" || value === "private") return value;
  return null;
}
