import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

import {
  findRoomPlaybackState,
  saveRoomPlaybackState,
  type RoomPlaybackUpdateInput,
} from "@/src/repositories/playback";
import {
  createEmptyPlaybackState,
  formatPlaybackState,
} from "@/src/serializers/rooms";

export type { RoomPlaybackUpdateInput };

export async function getRoomPlaybackRecord(roomId: string) {
  return findRoomPlaybackState(roomId);
}

export async function getRoomPlaybackState(
  roomId: string
): Promise<RoomPlaybackState> {
  const playback = await findRoomPlaybackState(roomId);
  return playback
    ? formatPlaybackState(playback)
    : createEmptyPlaybackState(roomId);
}

export async function saveRoomPlaybackUpdate(input: {
  roomId: string;
  userId: string;
  playback: RoomPlaybackUpdateInput;
}) {
  return saveRoomPlaybackState(input);
}
