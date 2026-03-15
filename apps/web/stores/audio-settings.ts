"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AudioSettingsState {
  volume: number;
  isMuted: boolean;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  syncFromAudio: (audio: HTMLAudioElement) => void;
}

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) return 1;
  return Math.min(1, Math.max(0, volume));
}

export const useAudioSettingsStore = create<AudioSettingsState>()(
  persist(
    (set) => ({
      volume: 1,
      isMuted: false,
      setVolume: (volume) => {
        set({ volume: clampVolume(volume) });
      },
      setMuted: (isMuted) => {
        set({ isMuted });
      },
      syncFromAudio: (audio) => {
        set({
          volume: clampVolume(audio.volume),
          isMuted: audio.muted,
        });
      },
    }),
    {
      name: "tunetalk:audio-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
      }),
    }
  )
);
