"use client";

import { SkipForward } from "lucide-react";

import type { RoomQueueItemDto } from "@/api/rooms";
import { Button } from "@/components/ui/button";

interface RoomPlayerActionsProps {
  queue: RoomQueueItemDto[];
  canStart: boolean;
  isHost: boolean;
  isPaused: boolean;
  nextQueueItem: RoomQueueItemDto | null;
  onStartQueue: () => void;
  onSkipToNext: () => void;
}

export default function RoomPlayerActions({
  queue,
  canStart,
  isHost,
  isPaused,
  nextQueueItem,
  onStartQueue,
  onSkipToNext,
}: RoomPlayerActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canStart ? (
        <Button
          type="button"
          variant="secondary"
          className="rounded-full px-4"
          onClick={onStartQueue}
        >
          Start queue
        </Button>
      ) : null}
      {isHost && nextQueueItem ? (
        <Button
          type="button"
          variant="secondary"
          className="rounded-full px-4"
          onClick={onSkipToNext}
        >
          <SkipForward className="mr-2 h-4 w-4" />
          Next song
        </Button>
      ) : null}
      <div className="border-border/70 bg-muted text-text-strong rounded-full border px-3 py-1 text-xs font-medium sm:hidden">
        {isPaused ? "Paused" : "Playing"}
      </div>
      <div className="text-muted-foreground text-xs">
        {queue.length === 0
          ? "Queue is empty."
          : `${queue.length} track${queue.length === 1 ? "" : "s"} lined up`}
      </div>
    </div>
  );
}
