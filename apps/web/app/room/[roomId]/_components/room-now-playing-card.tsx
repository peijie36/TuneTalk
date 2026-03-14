"use client";

import { useEffect, useMemo, useState } from "react";

import { Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";

import { updateRoomPlayback, type RoomQueueItemDto } from "@/api/rooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRoomAudio } from "@/hooks/use-room-audio";
import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

interface RoomNowPlayingCardProps {
  roomId: string;
  queue: RoomQueueItemDto[];
  playbackState: RoomPlaybackState | null;
  isHost: boolean;
}

function formatPlaybackTime(seconds: number) {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = clamped % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
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

  useEffect(() => {
    setScrubPositionSec(null);
  }, [activeQueueItem?.id]);

  return (
    <Card className="border-border/70 shrink-0 overflow-hidden rounded-[26px] border bg-white/70 shadow-sm backdrop-blur">
      <CardContent className="grid gap-3 p-3.5 sm:p-4 lg:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0 space-y-3">
          <audio ref={audioRef} className="hidden" preload="metadata" />

          <div className="flex items-center gap-3.5">
            <div className="h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-[20px] shadow-sm sm:h-[4.75rem] sm:w-[4.75rem]">
              {artworkUrl ? (
                <img
                  src={artworkUrl}
                  alt=""
                  className="h-full w-full object-cover"
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
                  {isCurrentPaused ? "Paused" : "Playing"}
                </div>
              </div>
              <div className="text-text-strong min-w-0 truncate text-lg font-semibold">
                {nowPlayingTitle}
              </div>
              <div className="text-muted-foreground truncate text-sm">
                {nowPlayingArtist}
              </div>
            </div>
          </div>

          <div className="border-border/70 rounded-[22px] border bg-white/85 px-3 py-2.5 shadow-inner">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={togglePlayPause}
                disabled={!activeQueueItem}
              >
                {isAudioPaused ? (
                  <Play className="h-4 w-4 fill-current" />
                ) : (
                  <Pause className="h-4 w-4 fill-current" />
                )}
              </Button>

              <div className="min-w-0 flex-1">
                <input
                  type="range"
                  min={0}
                  max={effectiveDurationSec || 0}
                  step={1}
                  value={Math.min(
                    displayedCurrentTimeSec,
                    effectiveDurationSec
                  )}
                  disabled={
                    !isHost || !activeQueueItem || effectiveDurationSec <= 0
                  }
                  aria-label="Playback position"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent disabled:cursor-default"
                  style={{
                    background: `linear-gradient(to right, rgb(15 23 42) 0%, rgb(15 23 42) ${progressPercent}%, rgb(226 232 240) ${progressPercent}%, rgb(226 232 240) 100%)`,
                  }}
                  onChange={(event) => {
                    if (!isHost) return;
                    setScrubPositionSec(Number(event.target.value));
                  }}
                  onMouseUp={() => {
                    if (!isHost || scrubPositionSec === null) return;
                    seekTo(scrubPositionSec);
                    setScrubPositionSec(null);
                  }}
                  onTouchEnd={() => {
                    if (!isHost || scrubPositionSec === null) return;
                    seekTo(scrubPositionSec);
                    setScrubPositionSec(null);
                  }}
                  onKeyUp={() => {
                    if (!isHost || scrubPositionSec === null) return;
                    seekTo(scrubPositionSec);
                    setScrubPositionSec(null);
                  }}
                />
                <div className="text-muted-foreground mt-1 flex items-center justify-between text-[11px] font-medium tabular-nums">
                  <span>{formatPlaybackTime(displayedCurrentTimeSec)}</span>
                  <span>{formatPlaybackTime(effectiveDurationSec)}</span>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  className="text-text-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  onClick={toggleMuted}
                  disabled={!activeQueueItem}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  aria-label="Volume"
                  className="h-2 w-24 cursor-pointer appearance-none rounded-full bg-transparent"
                  style={{
                    background: `linear-gradient(to right, rgb(15 23 42) 0%, rgb(15 23 42) ${(isMuted ? 0 : volume) * 100}%, rgb(226 232 240) ${(isMuted ? 0 : volume) * 100}%, rgb(226 232 240) 100%)`,
                  }}
                  onChange={(event) => {
                    setAudioVolume(Number(event.target.value));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canStart ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-full px-4"
                onClick={() => {
                  const first = queue[0];
                  if (!first) return;
                  void updateRoomPlayback(roomId, {
                    queueItemId: first.id,
                    provider: first.provider,
                    providerTrackId: first.providerTrackId,
                    positionSec: 0,
                    isPaused: false,
                  });
                }}
              >
                Start queue
              </Button>
            ) : null}
            {isHost && nextQueueItem ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-full px-4"
                onClick={() => {
                  void updateRoomPlayback(roomId, {
                    queueItemId: nextQueueItem.id,
                    provider: nextQueueItem.provider,
                    providerTrackId: nextQueueItem.providerTrackId,
                    positionSec: 0,
                    isPaused: false,
                  });
                }}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Next song
              </Button>
            ) : null}
            <div className="border-border/70 bg-muted text-text-strong rounded-full border px-3 py-1 text-xs font-medium sm:hidden">
              {isCurrentPaused ? "Paused" : "Playing"}
            </div>
            <div className="text-muted-foreground text-xs">
              {queue.length === 0
                ? "Queue is empty."
                : `${queue.length} track${queue.length === 1 ? "" : "s"} lined up`}
            </div>
          </div>
        </div>

        <div className="border-border/70 rounded-[22px] border bg-white/80 p-2.5 shadow-inner">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-text-strong text-sm font-semibold">Queue</div>
            <div className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
              {queue.length}
            </div>
          </div>

          <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
            {queue.map((item, index) => {
              const isActive = item.id === activeQueueItem?.id;
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
      </CardContent>
    </Card>
  );
}
