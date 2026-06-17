import {
  DEFAULT_ROOM_CAPACITY,
  type RoomPlaybackState,
  type RoomQueueItem,
  type RoomSummary,
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

export interface RoomQueueItemRecord {
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
}

export interface RoomMessageRecord {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
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

export function formatQueueItem(row: RoomQueueItemRecord): RoomQueueItem {
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

export function formatRoomMessage(row: RoomMessageRecord) {
  return {
    id: row.id,
    sender: {
      id: row.userId,
      name: row.userName ?? "Unknown",
    },
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}
