import type { RoomSummary, RoomVisibility } from "@tunetalk/shared/rooms";

import { type DatedCursor, encodeDatedCursor } from "@/src/lib/dated-cursor";
import { getRoomPresenceCount } from "@/src/lib/room-realtime";
import {
  findRoomSummaryRow,
  listRoomSummaryRows,
  type RoomSummaryRow,
} from "@/src/repositories/rooms";
import {
  formatRoomSummary,
  type RoomSummaryRecord,
} from "@/src/serializers/rooms";

interface ListRoomSummariesInput {
  limit: number;
  q: string;
  visibility: RoomVisibility | null;
  cursor: DatedCursor | null;
}

function withPresenceCount(row: RoomSummaryRow): RoomSummaryRecord {
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
  const rows = await listRoomSummaryRows({ limit, q, visibility, cursor });
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
  const row = await findRoomSummaryRow(roomId);
  return row ? withPresenceCount(row) : null;
}
