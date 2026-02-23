export type RoomRole = "host" | "co_host" | "listener";

export interface RoomPlaybackState {
  roomId: string;
  trackId: string;
  positionMs: number;
  isPaused: boolean;
  updatedAt: string;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  role: RoomRole;
  lastSeenAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export const SKIP_VOTE_THRESHOLD = 0.5;

export * from "./room-realtime";
export * from "./rooms";
