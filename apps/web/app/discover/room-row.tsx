"use client";

import { memo, useCallback, type KeyboardEvent, type MouseEvent } from "react";

import { Lock, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

import type { RoomSummary } from "@tunetalk/shared";

export interface RoomRowProps {
  room: RoomSummary;
  isSelected: boolean;
  onSelect: (roomId: string) => void;
  onJoin: (roomId: string) => void;
}

function RoomRow({ room, isSelected, onSelect, onJoin }: RoomRowProps) {
  const isFull = room.participants.current >= room.participants.capacity;

  const handleSelect = useCallback(() => {
    onSelect(room.id);
  }, [onSelect, room.id]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(room.id);
      }
    },
    [onSelect, room.id]
  );

  const handleJoinClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onJoin(room.id);
    },
    [onJoin, room.id]
  );

  return (
    <div
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group border-border/70 focus-visible:ring-ring focus-visible:ring-offset-background w-full cursor-pointer rounded-3xl border px-5 py-4 text-left shadow-sm backdrop-blur transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        isSelected ? "bg-white/55" : "bg-white/88 hover:bg-white/75"
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "116px" }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text-strong truncate text-base font-semibold">
              {room.name}
            </span>
            {isFull ? <Badge variant="outline">Full</Badge> : null}
            {room.visibility === "private" ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Private
              </span>
            ) : null}
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <Users2 className="h-4 w-4" aria-hidden="true" />
              {room.participants.current}/{room.participants.capacity} People
            </span>
            <span className="hidden sm:inline">{"\u2022"}</span>
            <span className="truncate">Host: {room.host.name}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="text-text-strong text-sm sm:max-w-[320px] sm:text-right">
            <span className="text-muted-foreground font-medium">
              Now Playing:
            </span>{" "}
            <span className="font-semibold">{room.nowPlaying.title}</span>{" "}
            <span className="text-muted-foreground">
              {"\u2014"} {room.nowPlaying.artist}
            </span>
          </div>

          <div className="flex items-center justify-end">
            <Button
              size="sm"
              onClick={handleJoinClick}
              aria-label={`Join ${room.name}`}
              disabled={isFull}
            >
              Join
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoRoomRow = memo(RoomRow);
MemoRoomRow.displayName = "RoomRow";

export default MemoRoomRow;
