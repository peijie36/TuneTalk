import type { RoomQueueItem, TrackProvider } from "@tunetalk/shared/rooms";

import {
  addRoomQueueItemRow,
  listRoomQueueItemRows,
} from "@/src/repositories/queue";
import { formatQueueItem } from "@/src/serializers/rooms";

export async function listRoomQueueItems(
  roomId: string
): Promise<RoomQueueItem[]> {
  const rows = await listRoomQueueItemRows(roomId);
  return rows.map(formatQueueItem);
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
  const row = await addRoomQueueItemRow(input);
  return formatQueueItem(row);
}
