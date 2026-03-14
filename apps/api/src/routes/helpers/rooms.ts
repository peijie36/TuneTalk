import {
  DEFAULT_ROOM_CAPACITY,
  type RoomPlaybackState,
  type RoomSummary,
  type RoomVisibility,
  type TrackProvider,
} from "@tunetalk/shared/rooms";

export interface RoomSummaryRecord {
  id: string;
  name: string;
  createdAt: Date;
  isPublic: boolean;
  hostName: string | null;
  presenceCount: number;
  nowPlayingTitle: string | null;
  nowPlayingArtist: string | null;
  nowPlayingArtworkUrl: string | null;
}

export interface PlaybackStateRecord {
  roomId: string;
  queueItemId: string | null;
  provider: TrackProvider | null;
  providerTrackId: string | null;
  positionSec: number;
  isPaused: boolean;
  updatedAt: Date;
  controlledByUserId: string | null;
}

export function formatRoomSummary(row: RoomSummaryRecord): RoomSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    visibility: row.isPublic ? ("public" as const) : ("private" as const),
    host: { name: row.hostName ?? "Unknown" },
    participants: {
      current: row.presenceCount,
      capacity: DEFAULT_ROOM_CAPACITY,
    },
    nowPlaying: {
      title: row.nowPlayingTitle ?? "Nothing playing",
      artist: row.nowPlayingArtist ?? "Queue idle",
      artworkUrl: row.nowPlayingArtworkUrl,
    },
  };
}

export function formatPlaybackState(
  row: PlaybackStateRecord
): RoomPlaybackState {
  return {
    roomId: row.roomId,
    queueItemId: row.queueItemId,
    provider: row.provider,
    providerTrackId: row.providerTrackId,
    positionSec: row.positionSec,
    isPaused: row.isPaused,
    updatedAt: row.updatedAt.toISOString(),
    controlledByUserId: row.controlledByUserId,
  };
}

export function createEmptyPlaybackState(roomId: string): RoomPlaybackState {
  return {
    roomId,
    queueItemId: null,
    provider: null,
    providerTrackId: null,
    positionSec: 0,
    isPaused: true,
    updatedAt: new Date().toISOString(),
    controlledByUserId: null,
  };
}

export function coerceLimit(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

export function parseRoomVisibility(
  value: string | undefined
): RoomVisibility | null {
  if (value === "public" || value === "private") return value;
  return null;
}
