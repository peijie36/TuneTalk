export const DEFAULT_API_BASE_URL = "http://localhost:8787";
export const DEFAULT_ROOM_CAPACITY = 10;

export type RoomVisibility = "public" | "private";
export type RoomMemberRole = "host" | "member";

export function isRoomMemberRole(value: unknown): value is RoomMemberRole {
  return value === "host" || value === "member";
}

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
  role: RoomMemberRole;
  joinedAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  createdAt: string;
  visibility: RoomVisibility;
  host: {
    name: string;
  };
  participants: {
    current: number;
    capacity: number;
  };
  nowPlaying: {
    title: string;
    artist: string;
  };
}
