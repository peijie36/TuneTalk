import type { RoomSummary } from "@tunetalk/shared/rooms";

import {
  coercePlayback,
  coerceQueueItem,
  coerceRoom,
  coerceRoomList,
  coerceRoomMessageList,
  type QueueTrackInput,
  type RoomPlaybackDto,
  type RoomQueueItemDto,
} from "@/api/contracts/rooms";
import { ApiError, getErrorMessage } from "@/api/core/http";
import { API_BASE_URL } from "@/lib/constants";

export { ApiError } from "@/api/core/http";

export async function listRooms({
  signal,
  limit,
  cursor,
  q,
  visibility,
}: {
  signal?: AbortSignal;
  limit?: number;
  cursor?: string;
  q?: string;
  visibility?: "all" | "public" | "private";
} = {}): Promise<{ rooms: RoomSummary[]; nextCursor: string | null }> {
  const url = new URL(`${API_BASE_URL}/api/rooms`);
  if (typeof limit === "number") url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  if (q?.trim()) url.searchParams.set("q", q.trim());
  if (visibility && visibility !== "all") {
    url.searchParams.set("visibility", visibility);
  }

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
) {
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

export async function listRoomQueue(
  roomId: string
): Promise<RoomQueueItemDto[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/queue`,
    { credentials: "include" }
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to load queue (${response.status})`
    );
  }
  const list = Array.isArray((payload as { queue?: unknown })?.queue)
    ? (payload as { queue: unknown[] }).queue
    : [];
  return list
    .map(coerceQueueItem)
    .filter((item): item is RoomQueueItemDto => Boolean(item));
}

export async function addTrackToRoomQueue(
  roomId: string,
  input: QueueTrackInput
): Promise<RoomQueueItemDto> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/queue`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ??
        `Failed to add queue item (${response.status})`
    );
  }

  const item = coerceQueueItem((payload as { item?: unknown })?.item);
  if (!item) throw new ApiError(500, "Invalid queue item response");
  return item;
}

export async function getRoomPlayback(
  roomId: string
): Promise<RoomPlaybackDto> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/playback`,
    { credentials: "include" }
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ?? `Failed to load playback (${response.status})`
    );
  }

  const playback = coercePlayback(
    (payload as { playback?: unknown })?.playback
  );
  if (!playback) throw new ApiError(500, "Invalid playback response");
  return playback;
}

export async function updateRoomPlayback(
  roomId: string,
  input: {
    queueItemId?: string | null;
    provider?: "audius" | null;
    providerTrackId?: string | null;
    positionSec?: number;
    isPaused?: boolean;
  }
): Promise<RoomPlaybackDto> {
  const response = await fetch(
    `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/playback`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      getErrorMessage(payload) ??
        `Failed to update playback (${response.status})`
    );
  }

  const playback = coercePlayback(
    (payload as { playback?: unknown })?.playback
  );
  if (!playback) throw new ApiError(500, "Invalid playback response");
  return playback;
}

export type { QueueTrackInput, RoomPlaybackDto, RoomQueueItemDto };
