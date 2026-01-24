"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { listRoomMessages } from "@/api/rooms";

export function useRoomMessages(roomId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["roomMessages", roomId],
    queryFn: ({ pageParam, signal }) =>
      listRoomMessages(roomId, {
        signal,
        limit: 50,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && !!roomId && roomId !== "unknown",
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
