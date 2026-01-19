export const DEFAULT_API_BASE_URL = "http://localhost:8787";
export const DEFAULT_ROOM_CAPACITY = 10;

export type RoomVisibility = "public" | "private";

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
