export type LobbyRole = "host" | "co_host" | "listener";

export interface PlaybackState {
  lobbyId: string;
  trackId: string;
  positionMs: number;
  isPaused: boolean;
  updatedAt: string;
}

export interface LobbyMember {
  lobbyId: string;
  userId: string;
  role: LobbyRole;
  lastSeenAt: string;
}

export interface LobbyMessage {
  id: string;
  lobbyId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export const SKIP_VOTE_THRESHOLD = 0.5;

export * from "./rooms";
