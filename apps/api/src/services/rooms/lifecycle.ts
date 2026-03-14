import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { DEFAULT_ROOM_CAPACITY } from "@tunetalk/shared/rooms";
import argon2 from "argon2";
import { and, eq, sql } from "drizzle-orm";

export async function createRoomForUser(input: {
  userId: string;
  name: string;
  isPublic: boolean;
  password?: string;
}) {
  const roomId = `room_${crypto.randomUUID()}`;
  const passwordHash =
    input.isPublic || !input.password
      ? null
      : await argon2.hash(input.password, { type: argon2.argon2id });

  await db.insert(schema.room).values({
    id: roomId,
    name: input.name,
    isPublic: input.isPublic,
    passwordHash,
    createdByUserId: input.userId,
  });

  await db
    .insert(schema.roomMember)
    .values({ roomId, userId: input.userId, role: "host" })
    .onConflictDoNothing();

  return { id: roomId };
}

export async function joinRoomForUser(input: {
  roomId: string;
  userId: string;
  password?: string;
}) {
  return db.transaction<
    | { ok: true }
    | { ok: false; error: string; status: 400 | 403 | 404 | 409 | 500 }
  >(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.roomId}))`
    );

    const roomRow = await tx
      .select({
        id: schema.room.id,
        isPublic: schema.room.isPublic,
        passwordHash: schema.room.passwordHash,
      })
      .from(schema.room)
      .where(eq(schema.room.id, input.roomId))
      .limit(1);

    const room = roomRow.at(0);
    if (!room) {
      return { ok: false as const, error: "Room not found", status: 404 };
    }

    if (!room.isPublic) {
      if (!input.password) {
        return {
          ok: false as const,
          error: "Password is required.",
          status: 400,
        };
      }

      if (!room.passwordHash) {
        return {
          ok: false as const,
          error: "Room password is not configured.",
          status: 500,
        };
      }

      const passwordValid = await argon2.verify(
        room.passwordHash,
        input.password
      );
      if (!passwordValid) {
        return {
          ok: false as const,
          error: "Incorrect password.",
          status: 403,
        };
      }
    }

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

export async function leaveRoomForUser(input: {
  roomId: string;
  userId: string;
}) {
  const roomRow = await db
    .select({ createdByUserId: schema.room.createdByUserId })
    .from(schema.room)
    .where(eq(schema.room.id, input.roomId))
    .limit(1);

  const room = roomRow.at(0);
  if (!room) return null;

  const isHost = room.createdByUserId === input.userId;
  if (isHost) {
    await db.delete(schema.room).where(eq(schema.room.id, input.roomId));
    return { disbanded: true as const };
  }

  await db
    .delete(schema.roomMember)
    .where(
      and(
        eq(schema.roomMember.roomId, input.roomId),
        eq(schema.roomMember.userId, input.userId)
      )
    );

  return { left: true as const };
}
