import type { RoomRow } from "@tunetalk/db/schema";

export type RoomVisibility = "public" | "private";

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  host: {
    name: string;
  };
  visibility: RoomVisibility;
  participants: {
    current: number;
    capacity: number;
  };
  nowPlaying: {
    title: string;
    artist: string;
  };
}

const dbRoomSeed: RoomRow[] = [
  {
    id: "room_lofi_chill",
    name: "Lofi + Chill Corner",
    isPublic: true,
    passwordHash: null,
    createdByUserId: "user_mia",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: "room_synthwave_night",
    name: "Synthwave Night Run",
    isPublic: false,
    passwordHash: "mock_hash",
    createdByUserId: "user_arfi",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 6 * 60 * 1000),
  },
  {
    id: "room_pop_picks",
    name: "Pop Picks & Party",
    isPublic: true,
    passwordHash: null,
    createdByUserId: "user_sam",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 18 * 60 * 1000),
  },
  {
    id: "room_indie_finds",
    name: "Indie Finds Exchange",
    isPublic: true,
    passwordHash: null,
    createdByUserId: "user_alex",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 9 * 60 * 1000),
  },
  {
    id: "room_focus_mode",
    name: "Focus Mode: Deep Work",
    isPublic: false,
    passwordHash: "mock_hash",
    createdByUserId: "user_noah",
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 38 * 60 * 1000),
  },
  {
    id: "room_rnb_after_hours",
    name: "R&B After Hours",
    isPublic: true,
    passwordHash: null,
    createdByUserId: "user_taylor",
    createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    id: "room_kpop_comeback",
    name: "K-Pop Comeback Watch",
    isPublic: true,
    passwordHash: null,
    createdByUserId: "user_mina",
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: "room_private_vip",
    name: "VIP Listening Lounge",
    isPublic: false,
    passwordHash: "mock_hash",
    createdByUserId: "user_jay",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 55 * 60 * 1000),
  },
];

const userDirectory: Record<string, { name: string }> = {
  user_mia: { name: "Mia Chen" },
  user_arfi: { name: "Arfi Maulana" },
  user_sam: { name: "Sam Rivera" },
  user_alex: { name: "Alex Park" },
  user_noah: { name: "Noah Kim" },
  user_taylor: { name: "Taylor Brooks" },
  user_mina: { name: "Mina Cho" },
  user_jay: { name: "Jay Patel" },
};

function visibilityFromRoomSeed(seed: RoomRow): RoomVisibility {
  return seed.isPublic ? "public" : "private";
}

function findSeed(roomId: string) {
  return dbRoomSeed.find((seed) => seed.id === roomId);
}

function makeRoom(
  roomId: string,
  details: {
    participants: { current: number; capacity: number };
    nowPlaying: { title: string; artist: string };
  }
): Room {
  const seed = findSeed(roomId);
  if (!seed) throw new Error(`Missing mock room seed for ${roomId}`);

  return {
    id: seed.id,
    name: seed.name,
    createdAt: seed.createdAt,
    host: userDirectory[seed.createdByUserId],
    visibility: visibilityFromRoomSeed(seed),
    participants: details.participants,
    nowPlaying: details.nowPlaying,
  };
}

export const mockRooms: Room[] = [
  makeRoom("room_kpop_comeback", {
    participants: { current: 10, capacity: 14 },
    nowPlaying: { title: "COMEBACK", artist: "ECHO" },
  }),
  makeRoom("room_pop_picks", {
    participants: { current: 5, capacity: 15 },
    nowPlaying: { title: "Gravity", artist: "Nova Lane" },
  }),
  makeRoom("room_rnb_after_hours", {
    participants: { current: 6, capacity: 14 },
    nowPlaying: { title: "Quiet Storm", artist: "Velvet Room" },
  }),
  makeRoom("room_lofi_chill", {
    participants: { current: 7, capacity: 14 },
    nowPlaying: { title: "Sunset Drive", artist: "Kairo" },
  }),
  makeRoom("room_private_vip", {
    participants: { current: 10, capacity: 10 },
    nowPlaying: { title: "No Signal", artist: "Midnight Club" },
  }),
  makeRoom("room_synthwave_night", {
    participants: { current: 12, capacity: 14 },
    nowPlaying: { title: "Neon Pulse", artist: "Arcadia" },
  }),
  makeRoom("room_indie_finds", {
    participants: { current: 9, capacity: 14 },
    nowPlaying: { title: "Paper Planes", artist: "Hollow Trees" },
  }),
  makeRoom("room_focus_mode", {
    participants: { current: 3, capacity: 10 },
    nowPlaying: { title: "Ambient Bloom", artist: "Lumen" },
  }),
];

export const mockRoomsByCreatedAt: Room[] = [...mockRooms].sort(
  (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
);
