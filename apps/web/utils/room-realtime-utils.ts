"use client";

import type {
  RoomChatMessage,
  RoomPresenceParticipant,
  RoomRealtimeEvent,
} from "@tunetalk/shared/room-realtime";

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
      const role = p.role === "host" || p.role === "member" ? p.role : null;
      if (id && name && role) participants.push({ id, name, role });
    }

    return { type: "presence", roomId: record.roomId, participants };
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
