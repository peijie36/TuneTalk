import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import type { RoomSummary, RoomVisibility } from "@tunetalk/shared/rooms";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";

import { getRoomPresenceCount } from "@/src/lib/room-realtime";
import {
  type DatedCursor,
  encodeDatedCursor,
} from "@/src/routes/helpers/dated-cursor";
import {
  formatRoomSummary,
  type RoomSummaryRecord,
} from "@/src/routes/helpers/rooms";

interface ListRoomSummariesInput {
  limit: number;
  q: string;
  visibility: RoomVisibility | null;
  cursor: DatedCursor | null;
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

function withPresenceCount(
  row: Omit<RoomSummaryRecord, "presenceCount">
): RoomSummaryRecord {
  return {
    ...row,
    presenceCount: getRoomPresenceCount(row.id),
  };
}

export async function listRoomSummaries({
  limit,
  q,
  visibility,
  cursor,
}: ListRoomSummariesInput): Promise<{
  rooms: RoomSummary[];
  nextCursor: string | null;
}> {
  const filters = [
    q ? ilike(schema.room.name, `%${q}%`) : null,
    visibility ? eq(schema.room.isPublic, visibility === "public") : null,
    cursor
      ? or(
          lt(schema.room.createdAt, cursor.createdAt),
          and(
            eq(schema.room.createdAt, cursor.createdAt),
            lt(schema.room.id, cursor.id)
          )
        )
      : null,
  ].filter((condition): condition is NonNullable<typeof condition> =>
    Boolean(condition)
  );

  const rows = await getRoomSummaryBaseQuery()
    .where(
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? filters[0]
          : and(...filters)
    )
    .orderBy(desc(schema.room.createdAt), desc(schema.room.id))
    .limit(limit);

  const summaries = rows.map((row) =>
    formatRoomSummary(withPresenceCount(row))
  );

  const nextCursor =
    rows.length === limit
      ? encodeDatedCursor({
          id: rows.at(-1)!.id,
          createdAt: rows.at(-1)!.createdAt,
        })
      : null;

  return {
    rooms: summaries,
    nextCursor,
  };
}

export async function getRoomSummaryRecord(
  roomId: string
): Promise<RoomSummaryRecord | null> {
  const rows = await getRoomSummaryBaseQuery()
    .where(eq(schema.room.id, roomId))
    .limit(1);

  const row = rows.at(0);
  return row ? withPresenceCount(row) : null;
}
