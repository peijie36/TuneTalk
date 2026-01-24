export type RoomMemberRole = "host" | "member";

export interface RoomPresenceParticipant {
  id: string;
  name: string;
  role: RoomMemberRole;
}

export interface RoomChatMessage {
  id: string;
  sender: { id: string; name: string };
  text: string;
  createdAt: string;
}

export type RoomRealtimeEvent =
  | { type: "ping" }
  | { type: "pong" }
  | { type: "room_disbanded"; roomId: string }
  | { type: "chat_error"; roomId: string; error: string }
  | {
      type: "presence";
      roomId: string;
      participants: RoomPresenceParticipant[];
    }
  | ({ type: "chat"; roomId: string } & RoomChatMessage);
