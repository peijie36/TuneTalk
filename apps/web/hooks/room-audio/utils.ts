import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

export const DRIFT_THRESHOLD_SEC = 2;
export const PLAYBACK_PROGRESS_SYNC_INTERVAL_MS = 30_000;
export const PLAYBACK_PROGRESS_SYNC_THRESHOLD_SEC = 30;
const AUDIO_VOLUME_STORAGE_KEY = "tunetalk:room-audio-volume";
const AUDIO_MUTED_STORAGE_KEY = "tunetalk:room-audio-muted";

export function getAuthoritativePositionSec(
  playback: RoomPlaybackState | null
) {
  if (!playback) return 0;
  if (playback.isPaused) return playback.positionSec;

  const updatedAtMs = Date.parse(playback.updatedAt);
  if (!Number.isFinite(updatedAtMs)) return playback.positionSec;

  const elapsedSec = Math.max(0, (Date.now() - updatedAtMs) / 1000);
  return playback.positionSec + elapsedSec;
}

export function applyStoredAudioPreferences(audio: HTMLAudioElement) {
  const { storedVolume, storedMuted } = readStoredAudioPreferences();

  if (storedVolume !== null) {
    const parsedVolume = Number(storedVolume);
    if (Number.isFinite(parsedVolume)) {
      audio.volume = Math.min(1, Math.max(0, parsedVolume));
    }
  }

  if (storedMuted !== null) {
    audio.muted = storedMuted === "true";
  }
}

export function clampPosition(positionSec: number, durationSec: number) {
  return Math.min(Math.max(positionSec, 0), Math.max(durationSec, 0));
}

function readStoredAudioPreferences() {
  try {
    const storedVolume = window.localStorage.getItem(AUDIO_VOLUME_STORAGE_KEY);
    const storedMuted = window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY);
    return { storedVolume, storedMuted };
  } catch {
    return { storedVolume: null, storedMuted: null };
  }
}
