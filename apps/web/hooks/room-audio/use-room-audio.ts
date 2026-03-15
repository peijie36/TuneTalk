"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { audiusStreamUrl } from "@/api/audius";
import { updateRoomPlayback, type RoomQueueItemDto } from "@/api/rooms";
import {
  applyStoredAudioPreferences,
  clampPosition,
  DRIFT_THRESHOLD_SEC,
  getAuthoritativePositionSec,
  persistAudioPreferences,
  PLAYBACK_PROGRESS_SYNC_INTERVAL_MS,
  PLAYBACK_PROGRESS_SYNC_THRESHOLD_SEC,
} from "@/hooks/room-audio/utils";
import { useAudioSettingsStore } from "@/stores/audio-settings";
import type { RoomPlaybackState } from "@tunetalk/shared/rooms";

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
  const [playback, setPlayback] = useState<RoomPlaybackState | null>(null);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isAudioPaused, setIsAudioPaused] = useState(true);
  const volume = useAudioSettingsStore((state) => state.volume);
  const isMuted = useAudioSettingsStore((state) => state.isMuted);

  const activePlayback = realtimePlayback ?? playback;

  const activeQueueItem = useMemo(
    () => queue.find((item) => item.id === activePlayback?.queueItemId) ?? null,
    [activePlayback?.queueItemId, queue]
  );

  const persistVolumeState = useCallback((audio: HTMLAudioElement) => {
    persistAudioPreferences(audio);
  }, []);

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
        .then(setPlayback)
        .catch(() => undefined);
    },
    [activePlayback, isHost, roomId]
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
      setCurrentTimeSec(nextPositionSec);
      applyingRemoteRef.current = false;

      void updateRoomPlayback(roomId, {
        positionSec: Math.floor(nextPositionSec),
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        setPlayback(nextPlayback);
      });
    },
    [activePlayback, durationSec, isHost, roomId]
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

  const setAudioVolume = useCallback(
    (nextVolume: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const clampedVolume = Math.min(1, Math.max(0, nextVolume));
      audio.volume = clampedVolume;
      if (audio.muted && clampedVolume > 0) {
        audio.muted = false;
      }

      persistVolumeState(audio);
    },
    [persistVolumeState]
  );

  const toggleMuted = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    persistVolumeState(audio);
  }, [persistVolumeState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    applyStoredAudioPreferences(audio);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.volume !== volume) {
      audio.volume = volume;
    }

    if (audio.muted !== isMuted) {
      audio.muted = isMuted;
    }
  }, [isMuted, volume]);

  useEffect(() => {
    setDurationSec(activeQueueItem?.durationSec ?? 0);
  }, [activeQueueItem?.durationSec, activeQueueItem?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTimeSec(audio.currentTime);
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

      if (!isHost || applyingRemoteRef.current) return;

      void updateRoomPlayback(roomId, {
        isPaused: false,
        positionSec: Math.floor(audio.currentTime),
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        setPlayback(nextPlayback);
      });
    };

    const handlePause = () => {
      setIsAudioPaused(true);

      if (!isHost || applyingRemoteRef.current) return;

      void updateRoomPlayback(roomId, {
        isPaused: true,
        positionSec: Math.floor(audio.currentTime),
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        setPlayback(nextPlayback);
      });
    };

    const handleVolumeChange = () => {
      persistVolumeState(audio);
    };

    const handleEnded = () => {
      setCurrentTimeSec(0);
      setIsAudioPaused(true);

      if (!isHost || !activeQueueItem) return;

      const activeIndex = queue.findIndex(
        (item) => item.id === activeQueueItem.id
      );
      const next = activeIndex >= 0 ? (queue[activeIndex + 1] ?? null) : null;

      void updateRoomPlayback(roomId, {
        queueItemId: next?.id ?? null,
        provider: next?.provider ?? null,
        providerTrackId: next?.providerTrackId ?? null,
        positionSec: 0,
        isPaused: next ? false : true,
      }).then((nextPlayback) => {
        lastProgressSyncRef.current = nextPlayback.positionSec;
        setPlayback(nextPlayback);
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
  }, [activeQueueItem, isHost, persistVolumeState, queue, roomId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!activePlayback?.providerTrackId) {
      applyingRemoteRef.current = true;
      audio.pause();
      applyingRemoteRef.current = false;
      setCurrentTimeSec(0);
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
    }

    const remoteTime = getAuthoritativePositionSec(activePlayback);
    if (Math.abs(audio.currentTime - remoteTime) > DRIFT_THRESHOLD_SEC) {
      applyingRemoteRef.current = true;
      audio.currentTime = remoteTime;
      setCurrentTimeSec(remoteTime);
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
  }, [activePlayback]);

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
