export const DEFAULT_API_BASE_URL = "http://localhost:8787";
export const DEFAULT_ROOM_CAPACITY = 10;

export type RoomVisibility = "public" | "private";
export type RoomMemberRole = "host" | "member";
export type TrackProvider = "audius";

export function isRoomMemberRole(value: unknown): value is RoomMemberRole {
  return value === "host" || value === "member";
}

export function isTrackProvider(value: unknown): value is TrackProvider {
  return value === "audius";
}

export interface RoomQueueItem {
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
  createdAt: string;
}

export interface RoomPlaybackState {
  roomId: string;
  queueItemId: string | null;
  provider: TrackProvider | null;
  providerTrackId: string | null;
  positionSec: number;
  isPaused: boolean;
  updatedAt: string;
  controlledByUserId: string | null;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  role: RoomMemberRole;
  joinedAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  createdAt: string;
  visibility: RoomVisibility;
  host: {
    name: string;
  };
  participants: {
    current: number;
    capacity: number;
  };
  nowPlaying: {
    title: string;
    artist: string;
    artworkUrl: string | null;
  };
}
