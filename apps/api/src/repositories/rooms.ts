import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import type { RoomVisibility } from "@tunetalk/shared/rooms";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";

import type { DatedCursor } from "@/src/lib/dated-cursor";

export interface RoomAccessRow {
  id: string;
  isPublic: boolean;
  createdByUserId: string;
}

export interface RoomJoinRow {
  id: string;
  isPublic: boolean;
  passwordHash: string | null;
}

export interface RoomSummaryRow {
  id: string;
  name: string;
  createdAt: Date;
  isPublic: boolean;
  hostName: string | null;
  nowPlayingTitle: string | null;
  nowPlayingArtist: string | null;
  nowPlayingArtworkUrl: string | null;
}

export async function findRoomAccessById(
  roomId: string
): Promise<RoomAccessRow | null> {
  const rows = await db
    .select({
      id: schema.room.id,
      isPublic: schema.room.isPublic,
      createdByUserId: schema.room.createdByUserId,
    })
    .from(schema.room)
    .where(eq(schema.room.id, roomId))
    .limit(1);

  return rows.at(0) ?? null;
}

export async function findRoomJoinById(
  roomId: string
): Promise<RoomJoinRow | null> {
  const rows = await db
    .select({
      id: schema.room.id,
      isPublic: schema.room.isPublic,
      passwordHash: schema.room.passwordHash,
    })
    .from(schema.room)
    .where(eq(schema.room.id, roomId))
    .limit(1);

  return rows.at(0) ?? null;
}

export async function createRoomWithHostMembership(input: {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  passwordHash: string | null;
}) {
  await db.insert(schema.room).values({
    id: input.id,
    name: input.name,
    isPublic: input.isPublic,
    passwordHash: input.passwordHash,
    createdByUserId: input.userId,
  });

  await db
    .insert(schema.roomMember)
    .values({ roomId: input.id, userId: input.userId, role: "host" })
    .onConflictDoNothing();
}

export async function deleteRoom(roomId: string) {
  await db.delete(schema.room).where(eq(schema.room.id, roomId));
}

function getRoomSummarySelect() {
  return {
    id: schema.room.id,
    name: schema.room.name,
    createdAt: schema.room.createdAt,
    isPublic: schema.room.isPublic,
    hostName: schema.user.name,
    nowPlayingTitle: schema.roomQueueItem.title,
    nowPlayingArtist: schema.roomQueueItem.artistName,
    nowPlayingArtworkUrl: schema.roomQueueItem.artworkUrl,
  };
}

function getRoomSummaryBaseQuery() {
  return db
    .select(getRoomSummarySelect())
    .from(schema.room)
    .leftJoin(schema.user, eq(schema.user.id, schema.room.createdByUserId))
    .leftJoin(
      schema.roomPlaybackState,
      eq(schema.roomPlaybackState.roomId, schema.room.id)
    )
    .leftJoin(
      schema.roomQueueItem,
      eq(schema.roomQueueItem.id, schema.roomPlaybackState.queueItemId)
    );
}

export async function listRoomSummaryRows(input: {
  limit: number;
  q: string;
  visibility: RoomVisibility | null;
  cursor: DatedCursor | null;
}): Promise<RoomSummaryRow[]> {
  const filters = [
    input.q ? ilike(schema.room.name, `%${input.q}%`) : null,
    input.visibility
      ? eq(schema.room.isPublic, input.visibility === "public")
      : null,
    input.cursor
      ? or(
          lt(schema.room.createdAt, input.cursor.createdAt),
          and(
            eq(schema.room.createdAt, input.cursor.createdAt),
            lt(schema.room.id, input.cursor.id)
          )
        )
      : null,
  ].filter((condition): condition is NonNullable<typeof condition> =>
    Boolean(condition)
  );

  return getRoomSummaryBaseQuery()
    .where(
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? filters[0]
          : and(...filters)
    )
    .orderBy(desc(schema.room.createdAt), desc(schema.room.id))
    .limit(input.limit);
}

export async function findRoomSummaryRow(
  roomId: string
): Promise<RoomSummaryRow | null> {
  const rows = await getRoomSummaryBaseQuery()
    .where(eq(schema.room.id, roomId))
    .limit(1);

  return rows.at(0) ?? null;
}
