import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";
import type { RoomSummary } from "@tunetalk/shared/rooms";

import { API_BASE_URL } from "@/lib/constants";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const message = (payload as { error?: unknown }).error;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

function coerceRoom(value: unknown): RoomSummary | null {
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
    | { title?: unknown; artist?: unknown }
    | undefined;
  const nowPlayingTitle =
    typeof nowPlaying?.title === "string" ? nowPlaying.title : null;
  const nowPlayingArtist =
    typeof nowPlaying?.artist === "string" ? nowPlaying.artist : null;

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
    nowPlaying: { title: nowPlayingTitle, artist: nowPlayingArtist },
  };
}

function coerceRoomList(payload: unknown): RoomSummary[] {
  const list = Array.isArray(payload)
    ? payload
    : (payload as { rooms?: unknown })?.rooms;
  if (!Array.isArray(list)) return [];

  const rooms: RoomSummary[] = [];
  for (const item of list) {
    const room = coerceRoom(item);
    if (room) rooms.push(room);
  }

  return rooms.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
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

function coerceRoomMessageList(payload: unknown): RoomChatMessage[] {
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

export async function listRooms({
  signal,
  limit,
  cursor,
}: {
  signal?: AbortSignal;
  limit?: number;
  cursor?: string;
} = {}): Promise<{ rooms: RoomSummary[]; nextCursor: string | null }> {
  const url = new URL(`${API_BASE_URL}/api/rooms`);
  if (typeof limit === "number") url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to load rooms (${response.status})`
    );
  }

  const nextCursor =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { nextCursor?: unknown }).nextCursor === "string"
      ? (payload as { nextCursor: string }).nextCursor
      : null;

  return {
    rooms: coerceRoomList(payload),
    nextCursor,
  };
}

export async function getRoom(
  roomId: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<RoomSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}`,
    {
      method: "GET",
      credentials: "include",
      signal,
    }
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to load room (${response.status})`
    );
  }

  const room = coerceRoom(payload);
  if (!room) throw new ApiError(500, "Invalid room response");
  return room;
}

export async function listRoomMessages(
  roomId: string,
  {
    signal,
    cursor,
    limit,
  }: { signal?: AbortSignal; cursor?: string; limit?: number } = {}
): Promise<{ messages: RoomChatMessage[]; nextCursor: string | null }> {
  const url = new URL(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/messages`
  );
  if (typeof limit === "number") url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to load messages (${response.status})`
    );
  }

  const nextCursor =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { nextCursor?: unknown }).nextCursor === "string"
      ? (payload as { nextCursor: string }).nextCursor
      : null;

  return {
    messages: coerceRoomMessageList(payload),
    nextCursor,
  };
}

export async function createRoom({
  name,
  isPublic,
  password,
}: {
  name: string;
  isPublic: boolean;
  password?: string;
}): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      isPublic,
      password,
    }),
  });

  const payload: unknown = await response.json().catch(() => null);

  const createdId =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { id?: unknown }).id === "string"
      ? (payload as { id: string }).id
      : null;

  if (!response.ok || !createdId) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to create room (${response.status})`
    );
  }

  return { id: createdId };
}

export async function joinRoom(
  roomId: string,
  { password }: { password?: string } = {}
): Promise<{ joined: true }> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/join`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(password ? { password } : {}),
    }
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to join room (${response.status})`
    );
  }

  return { joined: true };
}

export async function leaveRoom(
  roomId: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<{ left: true } | { disbanded: true }> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/leave`,
    {
      method: "POST",
      credentials: "include",
      signal,
    }
  );

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to leave room (${response.status})`
    );
  }

  const disbanded =
    payload &&
    typeof payload === "object" &&
    (payload as { disbanded?: unknown }).disbanded === true;

  return disbanded ? { disbanded: true } : { left: true };
}
