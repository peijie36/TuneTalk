import type { RoomPlaybackState, RoomQueueItem } from "@tunetalk/shared/rooms";

import type { HonoAuthVariables } from "@/src/lib/hono-types";
import { findRoomMembershipRole } from "@/src/repositories/memberships";
import { findRoomAccessById } from "@/src/repositories/rooms";
import { formatPlaybackState } from "@/src/serializers/rooms";
import { getRoomPlaybackRecord } from "@/src/services/rooms/playback";
import { listRoomQueueItems } from "@/src/services/rooms/queue";

type AuthUser = HonoAuthVariables["Variables"]["user"];

export async function authorizeRoomRealtimeConnection(input: {
  roomId: string;
  user: AuthUser;
}): Promise<
  | {
      ok: true;
      user: { id: string; name: string; role: "host" | "member" };
    }
  | { ok: false; reason: string }
> {
  if (!input.user) return { ok: false, reason: "Unauthorized" };

  const room = await findRoomAccessById(input.roomId);
  if (!room) return { ok: false, reason: "Room not found" };

  const membershipRole = await findRoomMembershipRole({
    roomId: input.roomId,
    userId: input.user.id,
  });

  if (!membershipRole && room.createdByUserId !== input.user.id) {
    return {
      ok: false,
      reason: room.isPublic ? "Join room before connecting" : "Forbidden",
    };
  }

  const role = room.createdByUserId === input.user.id ? "host" : "member";
  const name =
    input.user.name?.trim() ||
    input.user.email?.trim() ||
    `user_${input.user.id}`;

  return {
    ok: true,
    user: {
      id: input.user.id,
      name,
      role,
    },
  };
}

export async function getRoomRealtimeBootstrap(roomId: string): Promise<{
  queue: RoomQueueItem[];
  playback: RoomPlaybackState | null;
}> {
  const [queue, playbackRecord] = await Promise.all([
    listRoomQueueItems(roomId),
    getRoomPlaybackRecord(roomId),
  ]);

  return {
    queue,
    playback: playbackRecord ? formatPlaybackState(playbackRecord) : null,
  };
}
