"use client";

import { useRef, useSyncExternalStore } from "react";

interface RoomChatUiSnapshot {
  chatError: string | null;
  liveAnnouncement: string;
}

type Listener = () => void;

export interface RoomChatUiState {
  getSnapshot: () => RoomChatUiSnapshot;
  subscribe: (listener: Listener) => () => void;
  setChatError: (value: string | null) => void;
  setLiveAnnouncement: (value: string) => void;
}

function createRoomChatUiState(): RoomChatUiState {
  let snapshot: RoomChatUiSnapshot = {
    chatError: null,
    liveAnnouncement: "",
  };
  const listeners = new Set<Listener>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setChatError: (value) => {
      if (snapshot.chatError === value) return;
      snapshot = {
        ...snapshot,
        chatError: value,
      };
      emit();
    },
    setLiveAnnouncement: (value) => {
      if (snapshot.liveAnnouncement === value) return;
      snapshot = {
        ...snapshot,
        liveAnnouncement: value,
      };
      emit();
    },
  };
}

export function useRoomChatUiState() {
  const stateRef = useRef<RoomChatUiState | null>(null);
  if (!stateRef.current) {
    stateRef.current = createRoomChatUiState();
  }

  return stateRef.current;
}

export function useRoomChatUiStateSnapshot(state: RoomChatUiState) {
  return useSyncExternalStore(
    state.subscribe,
    state.getSnapshot,
    state.getSnapshot
  );
}
