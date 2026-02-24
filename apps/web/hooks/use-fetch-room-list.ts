"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { ApiError, listRooms } from "@/api/rooms";
import type { RoomSummary } from "@tunetalk/shared/rooms";

interface RoomsResult {
  rooms: RoomSummary[];
  isFetching: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
}

const ROOMS_QUERY_KEY = ["rooms"] as const;
const ROOM_PAGE_LIMIT = 50;

export function useFetchRoomList(): RoomsResult {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ROOMS_QUERY_KEY,
    queryFn: ({ pageParam, signal }) =>
      listRooms({
        signal,
        limit: ROOM_PAGE_LIMIT,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
  }, [queryClient]);

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  const rooms = useMemo(() => {
    const ordered: RoomSummary[] = [];
    const seen = new Set<string>();

    for (const page of query.data?.pages ?? []) {
      for (const room of page.rooms) {
        if (seen.has(room.id)) continue;
        seen.add(room.id);
        ordered.push(room);
      }
    }

    return ordered;
  }, [query.data?.pages]);

  const error = query.error
    ? query.error instanceof ApiError
      ? query.error.message
      : query.error instanceof Error
        ? query.error.message
        : "Failed to load rooms"
    : null;

  return {
    rooms,
    isFetching: query.isFetching,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    error,
    refresh,
    loadMore,
  };
}
