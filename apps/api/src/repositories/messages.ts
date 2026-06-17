import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";

import type { DatedCursor } from "@/src/lib/dated-cursor";
import type { RoomMessageRecord } from "@/src/serializers/rooms";

export async function listRoomMessageRows(input: {
  roomId: string;
  limit: number;
  cursor: DatedCursor | null;
}): Promise<RoomMessageRecord[]> {
  return db
    .select({
      id: schema.roomMessage.id,
      text: schema.roomMessage.text,
      createdAt: schema.roomMessage.createdAt,
      userId: schema.roomMessage.userId,
      userName: schema.user.name,
    })
    .from(schema.roomMessage)
    .leftJoin(schema.user, eq(schema.user.id, schema.roomMessage.userId))
    .where(
      input.cursor
        ? and(
            eq(schema.roomMessage.roomId, input.roomId),
            or(
              lt(schema.roomMessage.createdAt, input.cursor.createdAt),
              and(
                eq(schema.roomMessage.createdAt, input.cursor.createdAt),
                lt(schema.roomMessage.id, input.cursor.id)
              )
            )
          )
        : eq(schema.roomMessage.roomId, input.roomId)
    )
    .orderBy(desc(schema.roomMessage.createdAt), desc(schema.roomMessage.id))
    .limit(input.limit);
}

export async function insertRoomMessage(input: {
  roomId: string;
  userId: string;
  text: string;
}) {
  const inserted = await db
    .insert(schema.roomMessage)
    .values({
      id: `msg_${crypto.randomUUID()}`,
      roomId: input.roomId,
      userId: input.userId,
      text: input.text,
    })
    .returning({
      id: schema.roomMessage.id,
      createdAt: schema.roomMessage.createdAt,
    });

  return inserted.at(0) ?? null;
}
