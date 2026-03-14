import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { and, eq } from "drizzle-orm";

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
  const roomRow = await db
    .select({
      id: schema.room.id,
      isPublic: schema.room.isPublic,
      createdByUserId: schema.room.createdByUserId,
    })
    .from(schema.room)
    .where(eq(schema.room.id, roomId))
    .limit(1);

  const room = roomRow.at(0);
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

  const member = await db
    .select({ role: schema.roomMember.role })
    .from(schema.roomMember)
    .where(
      and(
        eq(schema.roomMember.roomId, roomId),
        eq(schema.roomMember.userId, userId)
      )
    )
    .limit(1);

  if (!room.isPublic && member.length === 0) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const role =
    room.createdByUserId === userId ? "host" : (member.at(0)?.role ?? null);

  return {
    ok: true,
    room,
    role,
    isHost: role === "host",
  };
}
