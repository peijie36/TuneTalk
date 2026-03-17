"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";

interface RoomPlayerControlsProps {
  canSeek: boolean;
  currentTimeSec: number;
  durationSec: number;
  hasActiveTrack: boolean;
  isMuted: boolean;
  isPaused: boolean;
  progressPercent: number;
  scrubPositionSec: number | null;
  volume: number;
  onScrubChange: (value: number) => void;
  onScrubCommit: () => void;
  onToggleMuted: () => void;
  onTogglePlayPause: () => void;
  onVolumeChange: (value: number) => void;
}

function formatPlaybackTime(seconds: number) {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = clamped % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function RoomPlayerControls({
  canSeek,
  currentTimeSec,
  durationSec,
  hasActiveTrack,
  isMuted,
  isPaused,
  progressPercent,
  scrubPositionSec,
  volume,
  onScrubChange,
  onScrubCommit,
  onToggleMuted,
  onTogglePlayPause,
  onVolumeChange,
}: RoomPlayerControlsProps) {
  const seekSliderStyle = {
    "--tt-slider-track": `linear-gradient(to right, rgb(15 23 42) 0%, rgb(15 23 42) ${progressPercent}%, rgb(226 232 240) ${progressPercent}%, rgb(226 232 240) 100%)`,
  } as CSSProperties;

  const volumePercent = (isMuted ? 0 : volume) * 100;
  const volumeSliderStyle = {
    "--tt-slider-track": `linear-gradient(to right, rgb(15 23 42) 0%, rgb(15 23 42) ${volumePercent}%, rgb(226 232 240) ${volumePercent}%, rgb(226 232 240) 100%)`,
  } as CSSProperties;

  return (
    <div className="border-border/70 rounded-[22px] border bg-white/85 px-3 pt-2.5 pb-4 shadow-inner">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={onTogglePlayPause}
          disabled={!hasActiveTrack}
        >
          {isPaused ? (
            <Play className="h-4 w-4 fill-current" />
          ) : (
            <Pause className="h-4 w-4 fill-current" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex h-8 -translate-y-1 items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={durationSec || 0}
                step={1}
                value={Math.min(
                  scrubPositionSec ?? currentTimeSec,
                  durationSec
                )}
                disabled={!canSeek}
                aria-label="Playback position"
                className="tt-slider h-2 w-full cursor-pointer rounded-full disabled:cursor-default"
                style={seekSliderStyle}
                onChange={(event) => {
                  if (!canSeek) return;
                  onScrubChange(Number(event.target.value));
                }}
                onMouseUp={onScrubCommit}
                onTouchEnd={onScrubCommit}
                onKeyUp={onScrubCommit}
              />

              <div className="text-muted-foreground absolute inset-x-0 top-full mt-0.5 flex items-center justify-between text-[11px] font-medium tabular-nums">
                <span>
                  {formatPlaybackTime(scrubPositionSec ?? currentTimeSec)}
                </span>
                <span>{formatPlaybackTime(durationSec)}</span>
              </div>
            </div>

            <div className="flex h-8 shrink-0 items-center gap-2">
              <button
                type="button"
                className="text-text-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                onClick={onToggleMuted}
                disabled={!hasActiveTrack}
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
                className="tt-slider h-2 w-20 cursor-pointer rounded-full sm:w-24"
                style={volumeSliderStyle}
                onChange={(event) => {
                  onVolumeChange(Number(event.target.value));
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
