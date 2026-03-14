import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";
import type { RoomSummary } from "@tunetalk/shared/rooms";

export interface QueueTrackInput {
  provider: "audius";
  providerTrackId: string;
  title: string | null;
  artistName: string | null;
  artworkUrl: string | null;
  durationSec: number | null;
}

export interface RoomQueueItemDto extends QueueTrackInput {
  id: string;
  roomId: string;
  position: number;
  addedByUserId: string | null;
  createdAt: string;
}

export interface RoomPlaybackDto {
  roomId: string;
  queueItemId: string | null;
  provider: "audius" | null;
  providerTrackId: string | null;
  positionSec: number;
  isPaused: boolean;
  updatedAt: string;
  controlledByUserId: string | null;
}

export function coerceRoom(value: unknown): RoomSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  const createdAtValue = record.createdAt;
  const createdAt = typeof createdAtValue === "string" ? createdAtValue : null;
  const createdAtMs =
    typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;
  const visibility =
    record.visibility === "public" || record.visibility === "private"
      ? record.visibility
      : null;

  const host = record.host as { name?: unknown } | undefined;
  const hostName = typeof host?.name === "string" ? host.name : null;

  const participants = record.participants as
    | { current?: unknown; capacity?: unknown }
    | undefined;
  const participantsCurrent =
    typeof participants?.current === "number" ? participants.current : null;
  const participantsCapacity =
    typeof participants?.capacity === "number" ? participants.capacity : null;

  const nowPlaying = record.nowPlaying as
    | { title?: unknown; artist?: unknown; artworkUrl?: unknown }
    | undefined;
  const nowPlayingTitle =
    typeof nowPlaying?.title === "string" ? nowPlaying.title : null;
  const nowPlayingArtist =
    typeof nowPlaying?.artist === "string" ? nowPlaying.artist : null;
  const nowPlayingArtworkUrl =
    typeof nowPlaying?.artworkUrl === "string" ? nowPlaying.artworkUrl : null;

  if (
    !id ||
    !name ||
    !createdAt ||
    Number.isNaN(createdAtMs) ||
    !visibility ||
    !hostName ||
    participantsCurrent === null ||
    participantsCapacity === null ||
    !nowPlayingTitle ||
    !nowPlayingArtist
  ) {
    return null;
  }

  return {
    id,
    name,
    createdAt,
    host: { name: hostName },
    visibility,
    participants: {
      current: participantsCurrent,
      capacity: participantsCapacity,
    },
    nowPlaying: {
      title: nowPlayingTitle,
      artist: nowPlayingArtist,
      artworkUrl: nowPlayingArtworkUrl,
    },
  };
}

export function coerceRoomList(payload: unknown): RoomSummary[] {
  const list = Array.isArray(payload)
    ? payload
    : (payload as { rooms?: unknown })?.rooms;
  if (!Array.isArray(list)) return [];

  const rooms: RoomSummary[] = [];
  for (const item of list) {
    const room = coerceRoom(item);
    if (room) rooms.push(room);
  }

  return rooms;
}

function coerceRoomMessage(value: unknown): RoomChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id : null;
  const text = typeof record.text === "string" ? record.text : null;
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : null;
  const createdAtMs =
    typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;

  const sender = record.sender as { id?: unknown; name?: unknown } | undefined;
  const senderId = typeof sender?.id === "string" ? sender.id : null;
  const senderName = typeof sender?.name === "string" ? sender.name : null;

  if (
    !id ||
    !text ||
    !createdAt ||
    Number.isNaN(createdAtMs) ||
    !senderId ||
    !senderName
  ) {
    return null;
  }

  return {
    id,
    sender: { id: senderId, name: senderName },
    text,
    createdAt,
  };
}

export function coerceRoomMessageList(payload: unknown): RoomChatMessage[] {
  const list = Array.isArray(payload)
    ? payload
    : (payload as { messages?: unknown })?.messages;
  if (!Array.isArray(list)) return [];

  const messages: RoomChatMessage[] = [];
  for (const item of list) {
    const message = coerceRoomMessage(item);
    if (message) messages.push(message);
  }

  return messages.sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
  );
}

export function coerceQueueItem(value: unknown): RoomQueueItemDto | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.roomId !== "string" ||
    record.provider !== "audius" ||
    typeof record.providerTrackId !== "string" ||
    typeof record.position !== "number" ||
    typeof record.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    roomId: record.roomId,
    provider: "audius",
    providerTrackId: record.providerTrackId,
    title: typeof record.title === "string" ? record.title : null,
    artistName:
      typeof record.artistName === "string" ? record.artistName : null,
    artworkUrl:
      typeof record.artworkUrl === "string" ? record.artworkUrl : null,
    durationSec:
      typeof record.durationSec === "number" ? record.durationSec : null,
    position: record.position,
    addedByUserId:
      typeof record.addedByUserId === "string" ? record.addedByUserId : null,
    createdAt: record.createdAt,
  };
}

export function coercePlayback(value: unknown): RoomPlaybackDto | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.roomId !== "string" ||
    typeof record.positionSec !== "number" ||
    typeof record.isPaused !== "boolean" ||
    typeof record.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    roomId: record.roomId,
    queueItemId:
      typeof record.queueItemId === "string" ? record.queueItemId : null,
    provider: record.provider === "audius" ? "audius" : null,
    providerTrackId:
      typeof record.providerTrackId === "string"
        ? record.providerTrackId
        : null,
    positionSec: record.positionSec,
    isPaused: record.isPaused,
    updatedAt: record.updatedAt,
    controlledByUserId:
      typeof record.controlledByUserId === "string"
        ? record.controlledByUserId
        : null,
  };
}
