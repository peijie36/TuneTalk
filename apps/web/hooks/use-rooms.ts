"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { ApiError, listRooms } from "@/api/rooms";
import type { RoomSummary } from "@tunetalk/shared/rooms";

interface RoomsResult {
  rooms: RoomSummary[];
  isFetching: boolean;
  error: string | null;
  refresh: () => void;
}

const ROOMS_QUERY_KEY = ["rooms"] as const;

export function useRooms(): RoomsResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ROOMS_QUERY_KEY,
    queryFn: ({ signal }) => listRooms({ signal }),
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
  }, [queryClient]);

  const error = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : query.error instanceof Error
        ? query.error.message
        : "Failed to load rooms"
    : null;

  return {
    rooms: query.data ?? [],
    isFetching: query.isFetching,
    error,
    refresh,
  };
}
