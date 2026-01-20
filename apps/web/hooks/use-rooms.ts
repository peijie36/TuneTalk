"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RoomSummary } from "@tunetalk/shared";

import { API_BASE_URL } from "@/lib/constants";

import { mockRoomsByCreatedAt } from "@/app/discover/rooms-mock";

type RoomsSource = "mock" | "api";

interface RoomsResult {
  rooms: RoomSummary[];
  isFetching: boolean;
  error: string | null;
  source: RoomsSource;
  refresh: () => void;
}

const USE_API_ROOMS = process.env.NEXT_PUBLIC_USE_API_ROOMS === "true";

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

async function fetchRoomsFromApi({
  signal,
}: {
  signal: AbortSignal;
}): Promise<RoomSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: "GET",
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load rooms (${response.status})`);
  }

  const payload: unknown = await response.json();
  const list = Array.isArray(payload)
    ? payload
    : (payload as { rooms?: unknown })?.rooms;

  if (!Array.isArray(list)) {
    throw new Error("Invalid rooms response");
  }

  const rooms: RoomSummary[] = [];
  for (const item of list) {
    const room = coerceRoom(item);
    if (room) rooms.push(room);
  }

  return rooms.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export function useRooms(): RoomsResult {
  const [rooms, setRooms] = useState<RoomSummary[]>(() => mockRoomsByCreatedAt);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<RoomsSource>("mock");
  const [refreshToken, setRefreshToken] = useState(0);
  const hasLoadedApiOnce = useRef(false);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!USE_API_ROOMS) return;

    const controller = new AbortController();

    setIsFetching(true);
    setError(null);

    void fetchRoomsFromApi({ signal: controller.signal })
      .then((nextRooms) => {
        hasLoadedApiOnce.current = true;
        setSource("api");
        setRooms(nextRooms);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load rooms");
        setSource(hasLoadedApiOnce.current ? "api" : "mock");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsFetching(false);
      });

    return () => controller.abort();
  }, [refreshToken]);

  return { rooms, isFetching, error, source, refresh };
}
