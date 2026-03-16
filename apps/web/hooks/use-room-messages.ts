"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { listRoomMessages } from "@/api/rooms";
import { mergeRoomMessagePages } from "@/utils/room-messages";

export function useRoomMessages(roomId: string, enabled: boolean) {
  const query = useInfiniteQuery({
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

  const messages = useMemo(
    () => mergeRoomMessagePages(query.data?.pages ?? []),
    [query.data?.pages]
  );

  return {
    ...query,
    messages,
  };
}
