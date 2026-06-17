import type { RoomRealtimeEvent } from "@tunetalk/shared/room-realtime";

import { type DatedCursor, encodeDatedCursor } from "@/src/lib/dated-cursor";
import {
  insertRoomMessage,
  listRoomMessageRows,
} from "@/src/repositories/messages";
import { formatRoomMessage } from "@/src/serializers/rooms";
import { getRoomAccessContext } from "@/src/services/rooms/access";

export async function listRoomMessages(input: {
  roomId: string;
  userId: string | null;
  limit: number;
  cursor: DatedCursor | null;
}) {
  const access = await getRoomAccessContext(input.roomId, input.userId);
  if (!access.ok) return access;

  const rows = await listRoomMessageRows({
    roomId: input.roomId,
    limit: input.limit,
    cursor: input.cursor,
  });

  const messages = rows.map(formatRoomMessage).reverse();
  const nextCursor =
    rows.length === input.limit
      ? encodeDatedCursor({
          id: rows.at(-1)!.id,
          createdAt: rows.at(-1)!.createdAt,
        })
      : null;

  return { ok: true as const, messages, nextCursor };
}

export async function createRoomChatEvent(input: {
  roomId: string;
  user: { id: string; name: string };
  text: string;
}): Promise<RoomRealtimeEvent | null> {
  const row = await insertRoomMessage({
    roomId: input.roomId,
    userId: input.user.id,
    text: input.text,
  });

  return {
    type: "chat",
    roomId: input.roomId,
    id: row?.id ?? `msg_${crypto.randomUUID()}`,
    sender: { id: input.user.id, name: input.user.name },
    text: input.text,
    createdAt: (row?.createdAt ?? new Date()).toISOString(),
  };
}
