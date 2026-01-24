"use client";

import { useQuery } from "@tanstack/react-query";

import { listRoomMessages } from "@/api/rooms";

export function useRoomMessages(roomId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["roomMessages", roomId],
    queryFn: ({ signal }) => listRoomMessages(roomId, { signal, limit: 50 }),
    enabled: enabled && !!roomId && roomId !== "unknown",
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
