import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { searchAudiusTracks, type AudiusTrack } from "@/api/audius";
import { addTrackToRoomQueue } from "@/api/rooms";

export function useRoomMusicSearch({ roomId }: { roomId: string }) {
  const [musicQuery, setMusicQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const clearSearch = useCallback(() => {
    setMusicQuery("");
    setSearchQuery("");
  }, []);

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
    mutationFn: (track: AudiusTrack) =>
      addTrackToRoomQueue(roomId, {
        provider: "audius",
        providerTrackId: track.id,
        title: track.title,
        artistName: track.artistName,
        artworkUrl: track.artworkUrl,
        durationSec: track.durationSec,
      }),
    onSuccess: () => {
      clearSearch();
    },
  });

  const selectTrack = useCallback(
    (track: AudiusTrack) => {
      if (!track.isStreamable || addMutation.isPending) return;
      addMutation.mutate(track);
    },
    [addMutation]
  );

  const showResults =
    searchQuery.length >= 2 &&
    (searchResults.isPending ||
      searchResults.isSuccess ||
      searchResults.error instanceof Error);

  return {
    musicQuery,
    setMusicQuery,
    clearSearch,
    results: searchResults.data ?? [],
    searchError:
      searchResults.error instanceof Error ? searchResults.error : null,
    isSearching: searchResults.isPending,
    isAddingTrack: addMutation.isPending,
    showResults,
    selectTrack,
  };
}
