"use client";

import type { RoomQueueItemDto } from "@/api/rooms";

interface RoomQueuePanelProps {
  activeQueueItemId: string | null;
  queue: RoomQueueItemDto[];
}

export default function RoomQueuePanel({
  activeQueueItemId,
  queue,
}: RoomQueuePanelProps) {
  return (
    <div className="border-border/70 rounded-[22px] border bg-white/80 p-2.5 shadow-inner">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-text-strong text-sm font-semibold">Queue</div>
        <div className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
          {queue.length}
        </div>
      </div>

      <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
        {queue.map((item, index) => {
          const isActive = item.id === activeQueueItemId;
          return (
            <div
              key={item.id}
              className={`rounded-xl px-2.5 py-1.5 text-[13px] transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-text-strong bg-white/90"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`mt-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] leading-tight font-medium">
                    {item.title ?? item.providerTrackId}
                  </div>
                  <div
                    className={`truncate text-[11px] leading-tight ${
                      isActive
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.artistName ?? "Audius"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {queue.length === 0 ? (
          <div className="text-muted-foreground rounded-xl bg-white/80 px-2.5 py-3 text-[13px]">
            No tracks queued.
          </div>
        ) : null}
      </div>
    </div>
  );
}
