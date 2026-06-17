import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import type { TrackProvider } from "@tunetalk/shared/rooms";
import { and, eq, gte, lt, lte, sql } from "drizzle-orm";

import type { RoomQueueItemRecord } from "@/src/serializers/rooms";

function getQueueItemSelect() {
  return {
    id: schema.roomQueueItem.id,
    roomId: schema.roomQueueItem.roomId,
    provider: schema.roomQueueItem.provider,
    providerTrackId: schema.roomQueueItem.providerTrackId,
    title: schema.roomQueueItem.title,
    artistName: schema.roomQueueItem.artistName,
    artworkUrl: schema.roomQueueItem.artworkUrl,
    durationSec: schema.roomQueueItem.durationSec,
    position: schema.roomQueueItem.position,
    addedByUserId: schema.roomQueueItem.addedByUserId,
    createdAt: schema.roomQueueItem.createdAt,
  };
}

export async function listRoomQueueItemRows(
  roomId: string
): Promise<RoomQueueItemRecord[]> {
  return db
    .select(getQueueItemSelect())
    .from(schema.roomQueueItem)
    .where(eq(schema.roomQueueItem.roomId, roomId))
    .orderBy(schema.roomQueueItem.position);
}

export async function addRoomQueueItemRow(input: {
  roomId: string;
  userId: string;
  provider: TrackProvider;
  providerTrackId: string;
  title?: string | null;
  artistName?: string | null;
  artworkUrl?: string | null;
  durationSec?: number | null;
}): Promise<RoomQueueItemRecord> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.roomId}))`
    );

    const nextPosRow = await tx
      .select({
        maxPosition: sql<number>`coalesce(max(${schema.roomQueueItem.position}), -1)`,
      })
      .from(schema.roomQueueItem)
      .where(eq(schema.roomQueueItem.roomId, input.roomId))
      .limit(1);

    const position = Number(nextPosRow.at(0)?.maxPosition ?? -1) + 1;

    const insertedRows = await tx
      .insert(schema.roomQueueItem)
      .values({
        id: `queue_${crypto.randomUUID()}`,
        roomId: input.roomId,
        provider: input.provider,
        providerTrackId: input.providerTrackId,
        title: input.title ?? null,
        artistName: input.artistName ?? null,
        artworkUrl: input.artworkUrl ?? null,
        durationSec: input.durationSec ?? null,
        position,
        addedByUserId: input.userId,
      })
      .returning(getQueueItemSelect());

    return insertedRows[0];
  });
}

export async function findRoomQueueItem(input: {
  roomId: string;
  queueItemId: string;
}) {
  return db.query.roomQueueItem.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, input.queueItemId), eq(table.roomId, input.roomId)),
  });
}

export function getDeleteConsumedQueueCondition(input: {
  roomId: string;
  existingPosition: number;
  nextPosition: number | null;
}) {
  return input.nextPosition === null
    ? and(
        eq(schema.roomQueueItem.roomId, input.roomId),
        lte(schema.roomQueueItem.position, input.existingPosition)
      )
    : and(
        eq(schema.roomQueueItem.roomId, input.roomId),
        lt(schema.roomQueueItem.position, input.nextPosition)
      );
}

export async function removeConsumedQueueItems(input: {
  roomId: string;
  existingPosition: number;
  nextPosition: number | null;
}) {
  return db.transaction(async (tx) => {
    const deleteCondition = getDeleteConsumedQueueCondition(input);
    const deletedCount =
      input.nextPosition === null
        ? input.existingPosition + 1
        : input.nextPosition;

    const removedQueueItemIds = (
      await tx
        .select({ id: schema.roomQueueItem.id })
        .from(schema.roomQueueItem)
        .where(deleteCondition)
    ).map((row) => row.id);

    if (removedQueueItemIds.length === 0) return removedQueueItemIds;

    await tx.delete(schema.roomQueueItem).where(deleteCondition);

    await tx
      .update(schema.roomQueueItem)
      .set({
        position: sql`${schema.roomQueueItem.position} - ${deletedCount}`,
      })
      .where(
        and(
          eq(schema.roomQueueItem.roomId, input.roomId),
          gte(schema.roomQueueItem.position, deletedCount)
        )
      );

    return removedQueueItemIds;
  });
}
