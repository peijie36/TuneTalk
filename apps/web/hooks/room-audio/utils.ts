import { useAudioSettingsStore } from "@/stores/audio-settings";
import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

export const DRIFT_THRESHOLD_SEC = 2;
export const PLAYBACK_PROGRESS_SYNC_INTERVAL_MS = 30_000;
export const PLAYBACK_PROGRESS_SYNC_THRESHOLD_SEC = 30;
export const PLAYBACK_UI_UPDATE_THRESHOLD_SEC = 0.1;

export function getAuthoritativePositionSec(
  playback: RoomPlaybackState | null,
  syncedAtMs: number | null
) {
  if (!playback) return 0;
  if (playback.isPaused) return playback.positionSec;

  const referenceMs = typeof syncedAtMs === "number" ? syncedAtMs : Number.NaN;
  if (!Number.isFinite(referenceMs)) {
    return playback.positionSec;
  }

  const elapsedSec = Math.max(0, (Date.now() - referenceMs) / 1000);
  return playback.positionSec + elapsedSec;
}

export function applyStoredAudioPreferences(audio: HTMLAudioElement) {
  const { volume, isMuted } = useAudioSettingsStore.getState();
  audio.volume = volume;
  audio.muted = isMuted;
}

export function persistAudioPreferences(audio: HTMLAudioElement) {
  useAudioSettingsStore.getState().syncFromAudio(audio);
}

export function clampPosition(positionSec: number, durationSec: number) {
  return Math.min(Math.max(positionSec, 0), Math.max(durationSec, 0));
}
