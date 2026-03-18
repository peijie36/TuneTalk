"use client";

import { useEffect, useRef, useState } from "react";

import type { RoomQueueItem } from "@tunetalk/shared/rooms";

import type { RoomQueueItemDto } from "@/api/rooms";

function sortQueueItems(queue: RoomQueueItemDto[]) {
  return [...queue].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function useRoomQueueState({
  roomId,
  roomReady,
  queueState,
  playbackQueueItemId,
}: {
  roomId: string;
  roomReady: boolean;
  queueState: RoomQueueItem[] | null;
  playbackQueueItemId: string | null;
}) {
  const [queue, setQueue] = useState<RoomQueueItemDto[]>([]);
  const prevPlaybackQueueItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    prevPlaybackQueueItemIdRef.current = null;
    setQueue([]);
  }, [roomId]);

  useEffect(() => {
    if (!queueState) return;
    setQueue(sortQueueItems(queueState));
  }, [queueState]);

  useEffect(() => {
    if (!roomReady) return;

    const previousQueueItemId = prevPlaybackQueueItemIdRef.current;
    prevPlaybackQueueItemIdRef.current = playbackQueueItemId;

    setQueue((current) => {
      const ordered = sortQueueItems(current);

      if (playbackQueueItemId) {
        const currentIndex = ordered.findIndex(
          (item) => item.id === playbackQueueItemId
        );
        return currentIndex > 0 ? ordered.slice(currentIndex) : ordered;
      }

      if (previousQueueItemId) {
        const previousIndex = ordered.findIndex(
          (item) => item.id === previousQueueItemId
        );
        return previousIndex >= 0 ? ordered.slice(previousIndex + 1) : ordered;
      }

      return ordered;
    });
  }, [playbackQueueItemId, roomReady]);

  return queue;
}
