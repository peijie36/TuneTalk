"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface HostRoomResumeState {
  roomId: string | null;
  roomName: string | null;
  hostUserId: string | null;
  updatedAt: string | null;
  setHostedRoom: (input: {
    roomId: string;
    roomName: string;
    hostUserId: string;
  }) => void;
  clearHostedRoom: () => void;
}

export const useHostRoomResumeStore = create<HostRoomResumeState>()(
  persist(
    (set) => ({
      roomId: null,
      roomName: null,
      hostUserId: null,
      updatedAt: null,
      setHostedRoom: ({ roomId, roomName, hostUserId }) => {
        set({
          roomId,
          roomName,
          hostUserId,
          updatedAt: new Date().toISOString(),
        });
      },
      clearHostedRoom: () => {
        set({
          roomId: null,
          roomName: null,
          hostUserId: null,
          updatedAt: null,
        });
      },
    }),
    {
      name: "tunetalk:host-room-resume",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
