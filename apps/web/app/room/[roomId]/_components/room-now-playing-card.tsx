"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { updateRoomPlayback, type RoomQueueItemDto } from "@/api/rooms";
import { Card, CardContent } from "@/components/ui/card";
import { useRoomAudio } from "@/hooks/use-room-audio";
import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

import RoomNowPlayingSummary from "./room-now-playing/room-now-playing-summary";
import RoomPlayerActions from "./room-now-playing/room-player-actions";
import RoomPlayerControls from "./room-now-playing/room-player-controls";
import RoomQueuePanel from "./room-now-playing/room-queue-panel";

interface RoomNowPlayingCardProps {
  roomId: string;
  queue: RoomQueueItemDto[];
  playbackState: RoomPlaybackState | null;
  isHost: boolean;
}

export default function RoomNowPlayingCard({
  roomId,
  queue,
  playbackState,
  isHost,
}: RoomNowPlayingCardProps) {
  const {
    audioRef,
    activeQueueItem,
    currentTimeSec,
    durationSec,
    isAudioPaused,
    volume,
    isMuted,
    seekTo,
    togglePlayPause,
    setAudioVolume,
    toggleMuted,
  } = useRoomAudio({
    roomId,
    queue,
    isHost,
    realtimePlayback: playbackState,
  });

  const [scrubPositionSec, setScrubPositionSec] = useState<number | null>(null);
  const artworkUrl = activeQueueItem?.artworkUrl ?? null;
  const nowPlayingTitle = activeQueueItem?.title ?? "-";
  const nowPlayingArtist = activeQueueItem?.artistName ?? "-";
  const isCurrentPaused = playbackState?.isPaused ?? isAudioPaused;

  const canStart = useMemo(
    () => isHost && queue.length > 0,
    [isHost, queue.length]
  );
  const nextQueueItem = useMemo(() => {
    if (!activeQueueItem) return queue[0] ?? null;
    const activeIndex = queue.findIndex(
      (item) => item.id === activeQueueItem.id
    );
    return activeIndex >= 0 ? (queue[activeIndex + 1] ?? null) : null;
  }, [activeQueueItem, queue]);

  const displayedCurrentTimeSec = scrubPositionSec ?? currentTimeSec;
  const effectiveDurationSec = Math.max(
    durationSec,
    activeQueueItem?.durationSec ?? 0
  );
  const progressPercent =
    effectiveDurationSec > 0
      ? Math.min(100, (displayedCurrentTimeSec / effectiveDurationSec) * 100)
      : 0;
  const canSeek =
    isHost && Boolean(activeQueueItem) && effectiveDurationSec > 0;

  const handleScrubCommit = useCallback(() => {
    if (!isHost || scrubPositionSec === null) return;
    seekTo(scrubPositionSec);
    setScrubPositionSec(null);
  }, [isHost, scrubPositionSec, seekTo]);

  const handleStartQueue = useCallback(() => {
    const first = queue[0];
    if (!first) return;

    void updateRoomPlayback(roomId, {
      queueItemId: first.id,
      provider: first.provider,
      providerTrackId: first.providerTrackId,
      positionSec: 0,
      isPaused: false,
    });
  }, [queue, roomId]);

  const handleSkipToNext = useCallback(() => {
    if (!nextQueueItem) return;

    void updateRoomPlayback(roomId, {
      queueItemId: nextQueueItem.id,
      provider: nextQueueItem.provider,
      providerTrackId: nextQueueItem.providerTrackId,
      positionSec: 0,
      isPaused: false,
    });
  }, [nextQueueItem, roomId]);

  useEffect(() => {
    setScrubPositionSec(null);
  }, [activeQueueItem?.id]);

  return (
    <Card className="border-border/70 shrink-0 overflow-hidden rounded-[26px] border bg-white/70 shadow-sm backdrop-blur">
      <CardContent className="grid gap-3 p-3.5 sm:p-4 lg:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0 space-y-3">
          <audio ref={audioRef} className="hidden" preload="metadata" />

          <RoomNowPlayingSummary
            artworkUrl={artworkUrl}
            title={nowPlayingTitle}
            artist={nowPlayingArtist}
            isPaused={isCurrentPaused}
          />

          <RoomPlayerControls
            canSeek={canSeek}
            currentTimeSec={displayedCurrentTimeSec}
            durationSec={effectiveDurationSec}
            hasActiveTrack={Boolean(activeQueueItem)}
            isMuted={isMuted}
            isPaused={isAudioPaused}
            progressPercent={progressPercent}
            scrubPositionSec={scrubPositionSec}
            volume={volume}
            onScrubChange={setScrubPositionSec}
            onScrubCommit={handleScrubCommit}
            onToggleMuted={toggleMuted}
            onTogglePlayPause={togglePlayPause}
            onVolumeChange={setAudioVolume}
          />

          <RoomPlayerActions
            queue={queue}
            canStart={canStart}
            isHost={isHost}
            isPaused={isCurrentPaused}
            nextQueueItem={nextQueueItem}
            onStartQueue={handleStartQueue}
            onSkipToNext={handleSkipToNext}
          />
        </div>

        <RoomQueuePanel
          activeQueueItemId={activeQueueItem?.id ?? null}
          queue={queue}
        />
      </CardContent>
    </Card>
  );
}
