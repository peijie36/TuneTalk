"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { ApiError, listRooms } from "@/api/rooms";
import type { RoomSummary } from "@tunetalk/shared/rooms";

type RoomFilter = "all" | "public" | "private";

interface RoomsResult {
  rooms: RoomSummary[];
  isFetching: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
}

export function useFetchRoomList({
  query: searchQuery,
  visibility,
  pageSize = 5,
}: {
  query: string;
  visibility: RoomFilter;
  pageSize?: number;
}): RoomsResult {
  const queryClient = useQueryClient();
  const normalizedQuery = searchQuery.trim();
  const queryKey = ["rooms", normalizedQuery, visibility, pageSize] as const;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      listRooms({
        signal,
        limit: pageSize,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
        q: normalizedQuery || undefined,
        visibility,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 0,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage]);

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
