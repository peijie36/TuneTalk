"use client";

import type {
  RoomChatMessage,
  RoomPresenceParticipant,
  RoomRealtimeEvent,
} from "@tunetalk/shared/room-realtime";
import { isRoomMemberRole, isTrackProvider } from "@tunetalk/shared/rooms";

export interface RoomMessagesPage {
  messages: RoomChatMessage[];
  nextCursor: string | null;
}

export function toWebSocketUrl(baseUrl: string) {
  if (baseUrl.startsWith("https://")) return `wss://${baseUrl.slice(8)}`;
  if (baseUrl.startsWith("http://")) return `ws://${baseUrl.slice(7)}`;
  return baseUrl;
}

export function isNearBottom(element: HTMLElement, threshold = 96) {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
  );
}

export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function parseWsEvent(data: string): RoomRealtimeEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const type = record.type;

  if (type === "ping" || type === "pong") return { type } as RoomRealtimeEvent;

  if (type === "room_disbanded" && typeof record.roomId === "string") {
    return { type: "room_disbanded", roomId: record.roomId };
  }

  if (
    type === "chat_error" &&
    typeof record.roomId === "string" &&
    typeof record.error === "string"
  ) {
    return { type: "chat_error", roomId: record.roomId, error: record.error };
  }

  if (
    type === "presence" &&
    typeof record.roomId === "string" &&
    Array.isArray(record.participants)
  ) {
    const participants: RoomPresenceParticipant[] = [];
    for (const item of record.participants) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const id = typeof p.id === "string" ? p.id : null;
      const name = typeof p.name === "string" ? p.name : null;
      const role = isRoomMemberRole(p.role) ? p.role : null;
      if (id && name && role) participants.push({ id, name, role });
    }

    return { type: "presence", roomId: record.roomId, participants };
  }

  if (
    type === "playback_state" &&
    typeof record.roomId === "string" &&
    record.playback &&
    typeof record.playback === "object"
  ) {
    const playback = record.playback as Record<string, unknown>;
    const roomId = typeof playback.roomId === "string" ? playback.roomId : null;
    const updatedAt =
      typeof playback.updatedAt === "string" ? playback.updatedAt : null;
    const positionSec =
      typeof playback.positionSec === "number" ? playback.positionSec : null;
    const isPaused =
      typeof playback.isPaused === "boolean" ? playback.isPaused : null;
    const provider = playback.provider === "audius" ? "audius" : null;
    const queueItemId =
      typeof playback.queueItemId === "string" ? playback.queueItemId : null;
    const providerTrackId =
      typeof playback.providerTrackId === "string"
        ? playback.providerTrackId
        : null;
    const controlledByUserId =
      typeof playback.controlledByUserId === "string"
        ? playback.controlledByUserId
        : null;

    if (!roomId || !updatedAt || positionSec === null || isPaused === null) {
      return null;
    }

    return {
      type: "playback_state",
      roomId: record.roomId,
      playback: {
        roomId,
        queueItemId,
        provider,
        providerTrackId,
        positionSec,
        isPaused,
        updatedAt,
        controlledByUserId,
      },
    };
  }

  if (
    typeof record.roomId === "string" &&
    type === "queue_state" &&
    Array.isArray(record.queue)
  ) {
    const queue = record.queue
      .map((item) =>
        item && typeof item === "object"
          ? parseRoomQueueItem(item as Record<string, unknown>)
          : null
      )
      .filter((item) => item !== null);

    return { type: "queue_state", roomId: record.roomId, queue };
  }

  if (
    type === "queue_item_added" &&
    typeof record.roomId === "string" &&
    record.item &&
    typeof record.item === "object"
  ) {
    const item = parseRoomQueueItem(record.item as Record<string, unknown>);
    if (!item) return null;
    return { type: "queue_item_added", roomId: record.roomId, item };
  }

  if (
    type === "queue_items_removed" &&
    typeof record.roomId === "string" &&
    Array.isArray(record.itemIds)
  ) {
    const itemIds = record.itemIds.filter(
      (itemId): itemId is string => typeof itemId === "string"
    );
    return { type: "queue_items_removed", roomId: record.roomId, itemIds };
  }

  if (
    type === "chat" &&
    typeof record.roomId === "string" &&
    typeof record.id === "string" &&
    typeof record.text === "string" &&
    typeof record.createdAt === "string" &&
    record.sender &&
    typeof record.sender === "object"
  ) {
    const sender = record.sender as Record<string, unknown>;
    const senderId = typeof sender.id === "string" ? sender.id : null;
    const senderName = typeof sender.name === "string" ? sender.name : null;
    if (!senderId || !senderName) return null;

    return {
      type: "chat",
      roomId: record.roomId,
      id: record.id,
      sender: { id: senderId, name: senderName },
      text: record.text,
      createdAt: record.createdAt,
    };
  }

  return null;
}

function parseRoomQueueItem(record: Record<string, unknown>) {
  const id = typeof record.id === "string" ? record.id : null;
  const roomId = typeof record.roomId === "string" ? record.roomId : null;
  const provider = isTrackProvider(record.provider) ? record.provider : null;
  const providerTrackId =
    typeof record.providerTrackId === "string" ? record.providerTrackId : null;
  const position = typeof record.position === "number" ? record.position : null;
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : null;

  if (!id || !roomId || !provider || !providerTrackId || position === null) {
    return null;
  }

  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }

  return {
    id,
    roomId,
    provider,
    providerTrackId,
    title: typeof record.title === "string" ? record.title : null,
    artistName:
      typeof record.artistName === "string" ? record.artistName : null,
    artworkUrl:
      typeof record.artworkUrl === "string" ? record.artworkUrl : null,
    durationSec:
      typeof record.durationSec === "number" ? record.durationSec : null,
    position,
    addedByUserId:
      typeof record.addedByUserId === "string" ? record.addedByUserId : null,
    createdAt,
  };
}

export function insertRoomMessage(
  messages: RoomChatMessage[],
  message: RoomChatMessage
) {
  if (messages.some((m) => m.id === message.id)) return messages;

  const last = messages.at(-1);
  if (!last) return [message];

  const lastAt = Date.parse(last.createdAt);
  const nextAt = Date.parse(message.createdAt);
  if (!Number.isFinite(lastAt) || !Number.isFinite(nextAt)) {
    return [...messages, message];
  }

  if (nextAt >= lastAt) return [...messages, message];

  let lo = 0;
  let hi = messages.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midAt = Date.parse(messages[mid].createdAt);
    if (!Number.isFinite(midAt) || midAt < nextAt) lo = mid + 1;
    else hi = mid;
  }

  return [...messages.slice(0, lo), message, ...messages.slice(lo)];
}
