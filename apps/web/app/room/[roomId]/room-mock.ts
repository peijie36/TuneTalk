export interface RoomParticipant {
  id: string;
  name: string;
  role: "host" | "listener";
  isYou?: boolean;
}

export interface RoomTrack {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
}

export interface RoomMessage {
  id: string;
  sender: string;
  text: string;
  isYou?: boolean;
}

export interface RoomDetail {
  id: string;
  name: string;
  hostName: string;
  isLive: boolean;
  participants: RoomParticipant[];
  currentTrack: RoomTrack;
  queue: RoomTrack[];
  messages: RoomMessage[];
}

const rooms: RoomDetail[] = [
  {
    id: "room_lofi_chill",
    name: "Lofi + Chill Corner",
    hostName: "Mia Chen",
    isLive: true,
    participants: [
      { id: "u_mia", name: "Mia Chen", role: "host" },
      { id: "u_arfi", name: "Arfi Maulana", role: "listener" },
      { id: "u_you", name: "You", role: "listener", isYou: true },
    ],
    currentTrack: {
      id: "t_ambient_01",
      title: "Sunset Drive",
      artist: "Kairo",
      durationSeconds: 214,
    },
    queue: [
      {
        id: "t_queue_01",
        title: "Quiet Storm",
        artist: "Velvet Room",
        durationSeconds: 196,
      },
      {
        id: "t_queue_02",
        title: "Neon Pulse",
        artist: "Arcadia",
        durationSeconds: 228,
      },
      {
        id: "t_queue_03",
        title: "Gravity",
        artist: "Nova Lane",
        durationSeconds: 205,
      },
    ],
    messages: [
      { id: "m1", sender: "Mia", text: "Welcome! Drop a track for the queue." },
      {
        id: "m2",
        sender: "Arfi",
        text: "This beat is perfect for late-night work.",
      },
      {
        id: "m3",
        sender: "You",
        text: "Love it — adding something chill next.",
        isYou: true,
      },
    ],
  },
];

export function getMockRoom(roomId: string): RoomDetail {
  return (
    rooms.find((room) => room.id === roomId) ?? {
      id: roomId,
      name: "Room Name",
      hostName: "Profile Name",
      isLive: true,
      participants: [
        { id: "u_host", name: "Profile Name", role: "host" },
        { id: "u_guest", name: "Profile Name", role: "listener" },
        { id: "u_you", name: "Profile Name", role: "listener", isYou: true },
      ],
      currentTrack: {
        id: "t_current",
        title: "Current Track",
        artist: "Artist",
        durationSeconds: 200,
      },
      queue: [
        {
          id: "t_next",
          title: "Song Name",
          artist: "Artist",
          durationSeconds: 198,
        },
      ],
      messages: [{ id: "m_welcome", sender: "Host", text: "Say hi 👋" }],
    }
  );
}
