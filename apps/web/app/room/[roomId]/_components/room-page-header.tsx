"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { searchAudiusTracks } from "@/api/audius";
import { addTrackToRoomQueue } from "@/api/rooms";
import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import { Input } from "@/components/ui/input";

interface RoomPageHeaderProps {
  roomId: string;
  musicQuery: string;
  onMusicQueryChange: (value: string) => void;
}

export default function RoomPageHeader({
  roomId,
  musicQuery,
  onMusicQueryChange,
}: RoomPageHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(musicQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [musicQuery]);

  const searchResults = useQuery({
    queryKey: ["audiusSearch", searchQuery],
    queryFn: () => searchAudiusTracks(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: ({
      roomId,
      input,
    }: {
      roomId: string;
      input: Parameters<typeof addTrackToRoomQueue>[1];
    }) => addTrackToRoomQueue(roomId, input),
    onSuccess: () => {
      onMusicQueryChange("");
    },
  });

  const showResults =
    searchQuery.length >= 2 &&
    (searchResults.isPending ||
      searchResults.isSuccess ||
      searchResults.error instanceof Error);

  return (
    <AppHeader containerClassName="relative flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
      <div className="relative order-1 w-full sm:max-w-[360px]">
        <label htmlFor="music-search" className="sr-only">
          Search music
        </label>
        <Input
          id="music-search"
          value={musicQuery}
          onChange={(event) => onMusicQueryChange(event.target.value)}
          placeholder="Search music..."
          className="h-12 rounded-full bg-white/75 px-5 shadow-sm backdrop-blur"
        />

        {showResults ? (
          <div className="absolute top-[calc(100%+0.6rem)] left-0 z-30 w-full overflow-hidden rounded-3xl border border-black/10 bg-white/95 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur">
            {searchResults.isPending ? (
              <div className="text-muted-foreground px-4 py-3 text-sm">
                Searching Audius...
              </div>
            ) : null}
            {searchResults.error instanceof Error ? (
              <div className="px-4 py-3 text-sm text-red-600">
                {searchResults.error.message}
              </div>
            ) : null}
            {searchResults.isSuccess && searchResults.data.length === 0 ? (
              <div className="text-muted-foreground px-4 py-3 text-sm">
                No tracks found.
              </div>
            ) : null}
            {searchResults.data && searchResults.data.length > 0 ? (
              <div className="max-h-80 overflow-y-auto py-2">
                {searchResults.data.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/4"
                    disabled={!track.isStreamable || addMutation.isPending}
                    onClick={() => {
                      if (!track.isStreamable) return;
                      addMutation.mutate({
                        roomId,
                        input: {
                          provider: "audius",
                          providerTrackId: track.id,
                          title: track.title,
                          artistName: track.artistName,
                          artworkUrl: track.artworkUrl,
                          durationSec: track.durationSec,
                        },
                      });
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

      <PrimaryNav className="order-2 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" />

      <div className="order-3 flex items-center justify-end">
        <AuthButtons />
      </div>
    </AppHeader>
  );
}
