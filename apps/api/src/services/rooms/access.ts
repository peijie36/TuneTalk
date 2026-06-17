import { findRoomMembershipRole } from "@/src/repositories/memberships";
import { findRoomAccessById } from "@/src/repositories/rooms";

export type RoomAccessContext =
  | {
      ok: false;
      status: 401 | 403 | 404;
      error: string;
    }
  | {
      ok: true;
      room: {
        id: string;
        isPublic: boolean;
        createdByUserId: string;
      };
      role: "host" | "member" | null;
      isHost: boolean;
    };

export async function getRoomAccessContext(
  roomId: string,
  userId: string | null
): Promise<RoomAccessContext> {
  const room = await findRoomAccessById(roomId);
  if (!room) {
    return {
      ok: false,
      status: 404,
      error: "Room not found",
    };
  }

  if (!userId) {
    if (!room.isPublic) {
      return {
        ok: false,
        status: 401,
        error: "Unauthorized",
      };
    }

    return {
      ok: true,
      room,
      role: null,
      isHost: false,
    };
  }

  const membershipRole = await findRoomMembershipRole({ roomId, userId });

  if (!room.isPublic && !membershipRole) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const role =
    room.createdByUserId === userId ? "host" : (membershipRole ?? null);

  return {
    ok: true,
    room,
    role,
    isHost: role === "host",
  };
}
