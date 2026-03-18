"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { audiusStreamUrl } from "@/api/audius";
import { updateRoomPlayback, type RoomQueueItemDto } from "@/api/rooms";
import {
  applyStoredAudioPreferences,
  clampPosition,
  DRIFT_THRESHOLD_SEC,
  getAuthoritativePositionSec,
  PLAYBACK_PROGRESS_SYNC_INTERVAL_MS,
  PLAYBACK_PROGRESS_SYNC_THRESHOLD_SEC,
  PLAYBACK_UI_UPDATE_THRESHOLD_SEC,
} from "@/hooks/room-audio/utils";
import { useAudioSettingsStore } from "@/stores/audio-settings";
import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

const OPTIMISTIC_UPDATED_AT = new Date(0).toISOString();

interface PlaybackSnapshot {
  state: RoomPlaybackState;
  syncedAtMs: number;
  source: "authoritative" | "local";
}

function toPlaybackSnapshot(
  state: RoomPlaybackState,
  source: PlaybackSnapshot["source"] = "authoritative"
): PlaybackSnapshot {
  return {
    state,
    syncedAtMs: Date.now(),
    source,
  };
}

export function useRoomAudio({
  roomId,
  queue,
  isHost,
  realtimePlayback,
}: {
  roomId: string;
  queue: RoomQueueItemDto[];
  isHost: boolean;
  realtimePlayback: RoomPlaybackState | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const applyingRemoteRef = useRef(false);
  const lastProgressSyncRef = useRef(0);
  const displayedTimeRef = useRef(0);
  const [playback, setPlayback] = useState<PlaybackSnapshot | null>(() =>
    realtimePlayback ? toPlaybackSnapshot(realtimePlayback) : null
  );
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isAudioPaused, setIsAudioPaused] = useState(true);
  const storedVolume = useAudioSettingsStore((state) => state.volume);
  const storedMuted = useAudioSettingsStore((state) => state.isMuted);
  const syncStoredAudioSettings = useAudioSettingsStore(
    (state) => state.syncFromAudio
  );
  const [volume, setVolume] = useState(storedVolume);
  const [isMuted, setIsMuted] = useState(storedMuted);

  const activePlayback = playback?.state ?? null;
  const activePlaybackSyncedAtMs = playback?.syncedAtMs ?? null;

  const syncAuthoritativePlayback = useCallback(
    (nextPlayback: RoomPlaybackState) => {
      setPlayback(toPlaybackSnapshot(nextPlayback));
    },
    []
  );

  const activeQueueItem = useMemo(
    () => queue.find((item) => item.id === activePlayback?.queueItemId) ?? null,
    [activePlayback?.queueItemId, queue]
  );

  const applyPlaybackPatch = useCallback(
    (patch: Partial<RoomPlaybackState>) => {
      setPlayback((current) => {
        const base = current?.state ?? realtimePlayback;
        if (!base && !patch.queueItemId && !patch.providerTrackId) return null;

        return toPlaybackSnapshot(
          {
            roomId,
            queueItemId: patch.queueItemId ?? base?.queueItemId ?? null,
            provider: patch.provider ?? base?.provider ?? null,
            providerTrackId:
              patch.providerTrackId ?? base?.providerTrackId ?? null,
            positionSec: patch.positionSec ?? base?.positionSec ?? 0,
            isPaused: patch.isPaused ?? base?.isPaused ?? true,
            // Optimistic client updates should not outrank server state.
            updatedAt:
              patch.updatedAt ?? base?.updatedAt ?? OPTIMISTIC_UPDATED_AT,
            controlledByUserId:
              patch.controlledByUserId ?? base?.controlledByUserId ?? null,
          },
          patch.updatedAt ? "authoritative" : "local"
        );
      });
    },
    [realtimePlayback, roomId]
  );

  const commitAudioPreferences = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    syncStoredAudioSettings(audio);
  }, [syncStoredAudioSettings]);

  const syncDisplayedTimeSec = useCallback(
    (nextTimeSec: number, asTransition = false) => {
      displayedTimeRef.current = nextTimeSec;
      if (asTransition) {
        startTransition(() => {
          setCurrentTimeSec(nextTimeSec);
        });
        return;
      }

      setCurrentTimeSec(nextTimeSec);
    },
    []
  );

  const syncPlaybackPosition = useCallback(
    (force = false) => {
      if (!isHost) return;

      const audio = audioRef.current;
      const current = activePlayback;
      if (!audio || !current || current.isPaused) return;

      const currentPositionSec = Math.floor(audio.currentTime);
      if (
        !force &&
        Math.abs(currentPositionSec - lastProgressSyncRef.current) <
          PLAYBACK_PROGRESS_SYNC_THRESHOLD_SEC
      ) {
        return;
      }

      lastProgressSyncRef.current = currentPositionSec;
      void updateRoomPlayback(roomId, {
        positionSec: currentPositionSec,
        isPaused: false,
      })
        .then(syncAuthoritativePlayback)
        .catch(() => undefined);
    },
    [activePlayback, isHost, roomId, syncAuthoritativePlayback]
  );

  const seekTo = useCallback(
    (positionSec: number) => {
      if (!isHost) return;

      const audio = audioRef.current;
      const current = activePlayback;
      if (!audio || !current) return;

      const nextPositionSec = clampPosition(positionSec, durationSec);
      applyingRemoteRef.current = true;
      audio.currentTime = nextPositionSec;
      syncDisplayedTimeSec(nextPositionSec);
      applyingRemoteRef.current = false;
      applyPlaybackPatch({
        positionSec: Math.floor(nextPositionSec),
      });

      void updateRoomPlayback(roomId, {
        positionSec: Math.floor(nextPositionSec),
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        syncAuthoritativePlayback(nextPlayback);
      });
    },
    [
      activePlayback,
      applyPlaybackPatch,
      durationSec,
      isHost,
      roomId,
      syncAuthoritativePlayback,
      syncDisplayedTimeSec,
    ]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
  }, []);

  const setAudioVolume = useCallback((nextVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedVolume = Math.min(1, Math.max(0, nextVolume));
    audio.volume = clampedVolume;
    setVolume(clampedVolume);
    if (audio.muted && clampedVolume > 0) {
      audio.muted = false;
      setIsMuted(false);
    }
  }, []);

  const toggleMuted = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
    syncStoredAudioSettings(audio);
  }, [syncStoredAudioSettings]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    applyStoredAudioPreferences(audio);
    setVolume(audio.volume);
    setIsMuted(audio.muted);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.volume !== storedVolume) {
      audio.volume = storedVolume;
    }

    if (audio.muted !== storedMuted) {
      audio.muted = storedMuted;
    }

    setVolume(audio.volume);
    setIsMuted(audio.muted);
  }, [storedMuted, storedVolume]);

  useEffect(() => {
    setPlayback((current) => {
      if (!realtimePlayback) return current;
      const nextPlayback = toPlaybackSnapshot(realtimePlayback);
      if (!current) return nextPlayback;

      const currentUpdatedAt = Date.parse(current.state.updatedAt);
      const nextUpdatedAt = Date.parse(realtimePlayback.updatedAt);

      if (
        !Number.isFinite(currentUpdatedAt) ||
        !Number.isFinite(nextUpdatedAt)
      ) {
        return nextPlayback;
      }

      if (nextUpdatedAt > currentUpdatedAt) return nextPlayback;
      if (nextUpdatedAt < currentUpdatedAt) return current;
      return current.source === "local" ? nextPlayback : current;
    });
  }, [realtimePlayback]);

  useEffect(() => {
    setPlayback(realtimePlayback ? toPlaybackSnapshot(realtimePlayback) : null);
    lastProgressSyncRef.current = 0;
    displayedTimeRef.current = 0;
  }, [roomId]);

  useEffect(() => {
    setDurationSec(activeQueueItem?.durationSec ?? 0);
  }, [activeQueueItem?.durationSec, activeQueueItem?.id]);

  useEffect(() => {
    const nextPositionSec = activePlayback?.positionSec ?? 0;
    syncDisplayedTimeSec(nextPositionSec);
    lastProgressSyncRef.current = nextPositionSec;
  }, [
    activePlayback?.providerTrackId,
    activePlayback?.queueItemId,
    syncDisplayedTimeSec,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime;
      if (
        Math.abs(displayedTimeRef.current - nextTime) <
        PLAYBACK_UI_UPDATE_THRESHOLD_SEC
      ) {
        return;
      }

      syncDisplayedTimeSec(nextTime, true);
    };

    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationSec(audio.duration);
        return;
      }

      setDurationSec(activeQueueItem?.durationSec ?? 0);
    };

    const handlePlay = () => {
      setIsAudioPaused(false);
      applyPlaybackPatch({
        isPaused: false,
        positionSec: Math.floor(audio.currentTime),
      });

      if (!isHost || applyingRemoteRef.current) return;

      void updateRoomPlayback(roomId, {
        isPaused: false,
        positionSec: Math.floor(audio.currentTime),
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        syncAuthoritativePlayback(nextPlayback);
      });
    };

    const handlePause = () => {
      setIsAudioPaused(true);
      applyPlaybackPatch({
        isPaused: true,
        positionSec: Math.floor(audio.currentTime),
      });

      if (!isHost || applyingRemoteRef.current) return;

      void updateRoomPlayback(roomId, {
        isPaused: true,
        positionSec: Math.floor(audio.currentTime),
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        syncAuthoritativePlayback(nextPlayback);
      });
    };

    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    const handleEnded = () => {
      syncDisplayedTimeSec(0);
      setIsAudioPaused(true);

      if (!isHost || !activeQueueItem) return;

      const activeIndex = queue.findIndex(
        (item) => item.id === activeQueueItem.id
      );
      const next = activeIndex >= 0 ? (queue[activeIndex + 1] ?? null) : null;

      applyPlaybackPatch({
        queueItemId: next?.id ?? null,
        provider: next?.provider ?? null,
        providerTrackId: next?.providerTrackId ?? null,
        positionSec: 0,
        isPaused: next ? false : true,
      });

      void updateRoomPlayback(roomId, {
        queueItemId: next?.id ?? null,
        provider: next?.provider ?? null,
        providerTrackId: next?.providerTrackId ?? null,
        positionSec: 0,
        isPaused: next ? false : true,
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        syncAuthoritativePlayback(nextPlayback);
      });
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("volumechange", handleVolumeChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    activeQueueItem,
    applyPlaybackPatch,
    isHost,
    queue,
    roomId,
    syncAuthoritativePlayback,
    syncDisplayedTimeSec,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!activePlayback?.providerTrackId) {
      applyingRemoteRef.current = true;
      audio.pause();
      applyingRemoteRef.current = false;
      syncDisplayedTimeSec(0);
      setIsAudioPaused(true);

      if (audio.getAttribute("src")) {
        audio.removeAttribute("src");
        audio.load();
      }
      return;
    }

    const nextSrc = audiusStreamUrl(activePlayback.providerTrackId);
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      applyStoredAudioPreferences(audio);
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    }

    const remoteTime = getAuthoritativePositionSec(
      activePlayback,
      activePlaybackSyncedAtMs
    );
    if (Math.abs(audio.currentTime - remoteTime) > DRIFT_THRESHOLD_SEC) {
      applyingRemoteRef.current = true;
      audio.currentTime = remoteTime;
      syncDisplayedTimeSec(remoteTime);
      applyingRemoteRef.current = false;
    }

    if (activePlayback.isPaused && !audio.paused) {
      applyingRemoteRef.current = true;
      audio.pause();
      applyingRemoteRef.current = false;
    }

    if (!activePlayback.isPaused && audio.paused) {
      applyingRemoteRef.current = true;
      void audio
        .play()
        .catch(() => undefined)
        .finally(() => {
          applyingRemoteRef.current = false;
        });
    }
  }, [activePlayback, activePlaybackSyncedAtMs, syncDisplayedTimeSec]);

  useEffect(() => {
    if (!isHost) return;

    const interval = window.setInterval(() => {
      syncPlaybackPosition();
    }, PLAYBACK_PROGRESS_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [isHost, syncPlaybackPosition]);

  useEffect(() => {
    if (!isHost) return;

    const flushPlaybackPosition = () => {
      syncPlaybackPosition(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPlaybackPosition();
      }
    };

    window.addEventListener("pagehide", flushPlaybackPosition);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushPlaybackPosition);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isHost, syncPlaybackPosition]);

  return {
    audioRef,
    activeQueueItem,
    applyPlaybackPatch,
    commitAudioPreferences,
    currentTimeSec,
    durationSec,
    isAudioPaused,
    volume,
    isMuted,
    seekTo,
    togglePlayPause,
    setAudioVolume,
    toggleMuted,
  };
}
