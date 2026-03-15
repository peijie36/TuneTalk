"use client";

import { useEffect, useState } from "react";

interface RoomNowPlayingSummaryProps {
  artworkUrl: string | null;
  title: string;
  artist: string;
  isPaused: boolean;
}

export default function RoomNowPlayingSummary({
  artworkUrl,
  title,
  artist,
  isPaused,
}: RoomNowPlayingSummaryProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [artworkUrl]);

  const showArtwork = Boolean(artworkUrl) && !hasImageError;

  return (
    <div className="flex items-center gap-3.5">
      <div className="h-17 w-17 shrink-0 overflow-hidden rounded-[20px] shadow-sm sm:h-19 sm:w-19">
        {showArtwork ? (
          <img
            src={artworkUrl ?? undefined}
            alt=""
            className="block h-full w-full object-cover"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center text-[10px] font-semibold tracking-[0.24em] uppercase">
            Audio
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <div className="bg-muted text-text-strong inline-flex rounded-full px-3 py-1.5 text-sm font-semibold">
            {isPaused ? "Paused" : "Playing"}
          </div>
        </div>
        <div className="text-text-strong min-w-0 truncate text-lg font-semibold">
          {title}
        </div>
        <div className="text-muted-foreground truncate text-sm">{artist}</div>
      </div>
    </div>
  );
}
