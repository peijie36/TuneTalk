import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import type { RoomQueueItem, TrackProvider } from "@tunetalk/shared/rooms";
import { eq, sql } from "drizzle-orm";

function formatQueueItem(row: {
  id: string;
  roomId: string;
  provider: TrackProvider;
  providerTrackId: string;
  title: string | null;
  artistName: string | null;
  artworkUrl: string | null;
  durationSec: number | null;
  position: number;
  addedByUserId: string | null;
  createdAt: Date;
}): RoomQueueItem {
  return {
    id: row.id,
    roomId: row.roomId,
    provider: row.provider,
    providerTrackId: row.providerTrackId,
    title: row.title,
    artistName: row.artistName,
    artworkUrl: row.artworkUrl,
    durationSec: row.durationSec,
    position: row.position,
    addedByUserId: row.addedByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRoomQueueItems(
  roomId: string
): Promise<RoomQueueItem[]> {
  const queueRows = await db
    .select({
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
    })
    .from(schema.roomQueueItem)
    .where(eq(schema.roomQueueItem.roomId, roomId))
    .orderBy(schema.roomQueueItem.position);

  return queueRows.map(formatQueueItem);
}

export async function addRoomQueueItem(input: {
  roomId: string;
  userId: string;
  provider: TrackProvider;
  providerTrackId: string;
  title?: string | null;
  artistName?: string | null;
  artworkUrl?: string | null;
  durationSec?: number | null;
}): Promise<RoomQueueItem> {
  const nextPosRow = await db
    .select({
      maxPosition: sql<number>`coalesce(max(${schema.roomQueueItem.position}), -1)`,
    })
    .from(schema.roomQueueItem)
    .where(eq(schema.roomQueueItem.roomId, input.roomId))
    .limit(1);

  const position = Number(nextPosRow.at(0)?.maxPosition ?? -1) + 1;

  const inserted = await db
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
    .returning({
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
    });

  return formatQueueItem(inserted[0]);
}

export { formatQueueItem };
