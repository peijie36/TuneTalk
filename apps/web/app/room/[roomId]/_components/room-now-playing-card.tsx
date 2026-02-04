"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface RoomNowPlayingCardProps {
  nowPlaying: { title: string; artist: string } | null;
}

export default function RoomNowPlayingCard({
  nowPlaying,
}: RoomNowPlayingCardProps) {
  return (
    <Card className="border-border/70 shrink-0 rounded-[28px] border bg-white/70 shadow-sm backdrop-blur">
      <CardHeader className="space-y-1">
        <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Now playing
        </div>
        <CardTitle className="text-text-strong truncate text-base font-semibold">
          {nowPlaying ? nowPlaying.title : "-"}
        </CardTitle>
        <div className="text-muted-foreground truncate text-sm">
          {nowPlaying ? nowPlaying.artist : "-"}
        </div>
      </CardHeader>
    </Card>
  );
}
