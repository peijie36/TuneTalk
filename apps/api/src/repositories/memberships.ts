import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { DEFAULT_ROOM_CAPACITY } from "@tunetalk/shared/rooms";
import { and, eq, sql } from "drizzle-orm";

export async function findRoomMembershipRole(input: {
  roomId: string;
  userId: string;
}): Promise<"host" | "member" | null> {
  const rows = await db
    .select({ role: schema.roomMember.role })
    .from(schema.roomMember)
    .where(
      and(
        eq(schema.roomMember.roomId, input.roomId),
        eq(schema.roomMember.userId, input.userId)
      )
    )
    .limit(1);

  return rows.at(0)?.role ?? null;
}

export async function joinRoomIfCapacityAvailable(input: {
  roomId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: 409 }> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.roomId}))`
    );

    const existingMembership = await tx
      .select({ roomId: schema.roomMember.roomId })
      .from(schema.roomMember)
      .where(
        and(
          eq(schema.roomMember.roomId, input.roomId),
          eq(schema.roomMember.userId, input.userId)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) return { ok: true as const };

    const countRow = await tx
      .select({ count: sql<number>`count(*)` })
      .from(schema.roomMember)
      .where(eq(schema.roomMember.roomId, input.roomId))
      .limit(1);

    const memberCount = Number(countRow.at(0)?.count ?? 0);
    if (memberCount >= DEFAULT_ROOM_CAPACITY) {
      return { ok: false as const, error: "Room is full.", status: 409 };
    }

    await tx.insert(schema.roomMember).values({
      roomId: input.roomId,
      userId: input.userId,
      role: "member",
    });

    return { ok: true as const };
  });
}

export async function deleteRoomMembership(input: {
  roomId: string;
  userId: string;
}) {
  await db
    .delete(schema.roomMember)
    .where(
      and(
        eq(schema.roomMember.roomId, input.roomId),
        eq(schema.roomMember.userId, input.userId)
      )
    );
}
