"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { RoomSummary } from "@tunetalk/shared/rooms";

export default function ServerInfoPanel({
  selectedRoom,
  canJoinSelected,
  onJoinRoom,
}: {
  selectedRoom: RoomSummary | null;
  canJoinSelected: boolean;
  onJoinRoom: (roomId: string) => void;
}) {
  return (
    <Card className="bg-surface/80 border-border/70 flex h-[400px] flex-col rounded-[28px] border shadow-sm backdrop-blur lg:h-[460px]">
      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-lg font-semibold">
          Server Information
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center gap-4 pt-0">
        <div className="text-muted-foreground text-sm">
          <span className="text-text-strong font-semibold">
            {selectedRoom?.name ?? "Lobby"}
          </span>{" "}
          <span className="text-muted-foreground">
            {selectedRoom
              ? `${selectedRoom.participants.current}/${selectedRoom.participants.capacity}`
              : "-"}
          </span>
        </div>

        <div className="flex w-full flex-1 items-center justify-center">
          <div className="bg-foreground/15 aspect-square w-full max-w-[170px] rounded-2xl shadow-inner" />
        </div>

        <div className="w-full space-y-2 text-center">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Current playing
          </p>
          <p className="text-text-strong text-sm font-semibold">
            {selectedRoom
              ? `${selectedRoom.nowPlaying.title} - ${selectedRoom.nowPlaying.artist}`
              : "Select a room"}
          </p>
        </div>

        {selectedRoom && canJoinSelected ? (
          <Button
            className="mt-auto h-12 w-full max-w-[190px]"
            onClick={() => onJoinRoom(selectedRoom.id)}
          >
            Join
          </Button>
        ) : (
          <Button className="mt-auto h-12 w-full max-w-[190px]" disabled>
            Join
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
