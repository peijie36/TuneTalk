"use client";

import { useEffect, useRef, useState } from "react";

import type { RoomQueueItem } from "@tunetalk/shared/rooms";

import type { RoomQueueItemDto } from "@/api/rooms";

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
    setQueue(queueState);
  }, [queueState]);

  useEffect(() => {
    if (!roomReady) return;

    const previousQueueItemId = prevPlaybackQueueItemIdRef.current;
    prevPlaybackQueueItemIdRef.current = playbackQueueItemId;

    setQueue((current) => {
      if (playbackQueueItemId) {
        const currentIndex = current.findIndex(
          (item) => item.id === playbackQueueItemId
        );
        return currentIndex > 0 ? current.slice(currentIndex) : current;
      }

      if (previousQueueItemId) {
        const previousIndex = current.findIndex(
          (item) => item.id === previousQueueItemId
        );
        return previousIndex >= 0 ? current.slice(previousIndex + 1) : current;
      }

      return current;
    });
  }, [playbackQueueItemId, roomReady]);

  return queue;
}
