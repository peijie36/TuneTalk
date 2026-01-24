"use client";

import { useQuery } from "@tanstack/react-query";

import { getRoom } from "@/api/rooms";

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ["room", roomId],
    queryFn: ({ signal }) => getRoom(roomId, { signal }),
    enabled: !!roomId && roomId !== "unknown",
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
