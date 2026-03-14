import type { RoomMemberRole, RoomPlaybackState, RoomQueueItem } from "./rooms";

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

export interface RoomPlaybackBroadcast {
  roomId: string;
  playback: RoomPlaybackState;
}

export interface RoomQueueBroadcast {
  roomId: string;
  queue: RoomQueueItem[];
}

export interface RoomQueueItemAddedBroadcast {
  roomId: string;
  item: RoomQueueItem;
}

export interface RoomQueueItemsRemovedBroadcast {
  roomId: string;
  itemIds: string[];
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
  | ({ type: "chat"; roomId: string } & RoomChatMessage)
  | ({ type: "playback_state" } & RoomPlaybackBroadcast)
  | ({ type: "queue_state" } & RoomQueueBroadcast)
  | ({ type: "queue_item_added" } & RoomQueueItemAddedBroadcast)
  | ({ type: "queue_items_removed" } & RoomQueueItemsRemovedBroadcast);
