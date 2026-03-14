import * as schema from "@tunetalk/db/schema";
import type { TrackProvider } from "@tunetalk/shared/rooms";
import { and, eq, gte, lt, lte, sql } from "drizzle-orm";

import { db } from "@tunetalk/db";

export interface RoomPlaybackUpdateInput {
  queueItemId?: string | null;
  provider?: TrackProvider | null;
  providerTrackId?: string | null;
  positionSec?: number;
  isPaused?: boolean;
}

export async function getRoomPlaybackRecord(roomId: string) {
  return db.query.roomPlaybackState.findFirst({
    where: (table, { eq }) => eq(table.roomId, roomId),
  });
}

export async function saveRoomPlaybackUpdate(input: {
  roomId: string;
  userId: string;
  playback: RoomPlaybackUpdateInput;
}): Promise<{
  playbackRow: typeof schema.roomPlaybackState.$inferSelect;
  removedQueueItemIds: string[];
} | null> {
  const hasQueueItemId = Object.prototype.hasOwnProperty.call(
    input.playback,
    "queueItemId"
  );

  return db
    .transaction(async (tx) => {
      const now = new Date();
      const existing = await tx.query.roomPlaybackState.findFirst({
        where: (table, { eq }) => eq(table.roomId, input.roomId),
      });
      let removedQueueItemIds: string[] = [];

      const nextQueueItemId = hasQueueItemId
        ? (input.playback.queueItemId ?? null)
        : (existing?.queueItemId ?? null);

      const nextQueueItem = nextQueueItemId
        ? await tx.query.roomQueueItem.findFirst({
            where: (table, { and, eq }) =>
              and(
                eq(table.id, nextQueueItemId),
                eq(table.roomId, input.roomId)
              ),
          })
        : null;

      if (nextQueueItemId && !nextQueueItem) {
        throw new Error("QUEUE_ITEM_NOT_FOUND");
      }

      const existingQueueItemId = existing?.queueItemId ?? null;

      if (
        hasQueueItemId &&
        existingQueueItemId &&
        existingQueueItemId !== nextQueueItemId
      ) {
        const existingQueueItem = await tx.query.roomQueueItem.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.id, existingQueueItemId),
              eq(table.roomId, input.roomId)
            ),
        });

        if (existingQueueItem) {
          const deleteCondition = nextQueueItem
            ? and(
                eq(schema.roomQueueItem.roomId, input.roomId),
                lt(schema.roomQueueItem.position, nextQueueItem.position)
              )
            : and(
                eq(schema.roomQueueItem.roomId, input.roomId),
                lte(schema.roomQueueItem.position, existingQueueItem.position)
              );

          const deletedCount = nextQueueItem
            ? nextQueueItem.position
            : existingQueueItem.position + 1;

          removedQueueItemIds = (
            await tx
              .select({ id: schema.roomQueueItem.id })
              .from(schema.roomQueueItem)
              .where(deleteCondition)
          ).map((row) => row.id);

          if (removedQueueItemIds.length > 0) {
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
          }
        }
      }

      const nextState: typeof schema.roomPlaybackState.$inferInsert = {
        roomId: input.roomId,
        queueItemId: nextQueueItemId,
        provider: nextQueueItem
          ? nextQueueItem.provider
          : hasQueueItemId
            ? null
            : (input.playback.provider ?? existing?.provider ?? null),
        providerTrackId: nextQueueItem
          ? nextQueueItem.providerTrackId
          : hasQueueItemId
            ? null
            : (input.playback.providerTrackId ??
              existing?.providerTrackId ??
              null),
        positionSec: Math.floor(
          input.playback.positionSec ?? existing?.positionSec ?? 0
        ),
        isPaused: input.playback.isPaused ?? existing?.isPaused ?? true,
        controlledByUserId: input.userId,
        updatedAt: now,
      };

      const [playbackRow] = await tx
        .insert(schema.roomPlaybackState)
        .values(nextState)
        .onConflictDoUpdate({
          target: schema.roomPlaybackState.roomId,
          set: {
            queueItemId: nextState.queueItemId,
            provider: nextState.provider,
            providerTrackId: nextState.providerTrackId,
            positionSec: nextState.positionSec,
            isPaused: nextState.isPaused,
            controlledByUserId: nextState.controlledByUserId,
            updatedAt: nextState.updatedAt,
          },
        })
        .returning();

      return { playbackRow, removedQueueItemIds };
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "QUEUE_ITEM_NOT_FOUND") {
        return null;
      }

      throw error;
    });
}
