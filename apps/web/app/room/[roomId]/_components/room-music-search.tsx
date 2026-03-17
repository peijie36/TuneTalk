"use client";

import { memo } from "react";

import { Input } from "@/components/ui/input";
import { useRoomMusicSearch } from "@/hooks/use-room-music-search";

interface RoomMusicSearchProps {
  roomId: string;
}

function RoomMusicSearch({ roomId }: RoomMusicSearchProps) {
  const {
    musicQuery,
    setMusicQuery,
    results,
    searchError,
    isSearching,
    isAddingTrack,
    showResults,
    selectTrack,
  } = useRoomMusicSearch({
    roomId,
  });

  return (
    <div className="relative order-1 w-full sm:max-w-[360px]">
      <label htmlFor="music-search" className="sr-only">
        Search music
      </label>
      <Input
        id="music-search"
        value={musicQuery}
        onChange={(event) => setMusicQuery(event.target.value)}
        placeholder="Search music..."
        className="h-12 rounded-full bg-white/75 px-5 shadow-sm backdrop-blur"
      />

      {showResults ? (
        <div className="absolute top-[calc(100%+0.6rem)] left-0 z-30 w-full overflow-hidden rounded-3xl border border-black/10 bg-white/95 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur">
          {isSearching ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">
              Searching Audius...
            </div>
          ) : null}
          {searchError ? (
            <div className="px-4 py-3 text-sm text-red-600">
              {searchError.message}
            </div>
          ) : null}
          {!isSearching && !searchError && results.length === 0 ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">
              No tracks found.
            </div>
          ) : null}
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/4"
                  disabled={!track.isStreamable || isAddingTrack}
                  onClick={() => {
                    selectTrack(track);
                  }}
                >
                  {track.artworkUrl ? (
                    <img
                      src={track.artworkUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[10px] font-semibold tracking-[0.2em] uppercase">
                      Audio
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-black">
                      {track.title}
                    </div>
                    <div className="text-muted-foreground truncate text-sm">
                      {track.artistName}
                    </div>
                    {!track.isStreamable ? (
                      <div className="mt-1 text-xs text-red-600">
                        Not streamable / gated
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(RoomMusicSearch);
