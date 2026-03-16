"use client";

import type { InfiniteData } from "@tanstack/react-query";

import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";
import type { RoomQueueItem } from "@tunetalk/shared/rooms";

import {
  insertRoomMessage,
  type RoomMessagesPage,
} from "@/utils/room-realtime-utils";

export function addRoomQueueItem(
  current: RoomQueueItem[] | null,
  item: RoomQueueItem
) {
  if (!current) return [item];
  if (current.some((queueItem) => queueItem.id === item.id)) {
    return current;
  }

  return [...current, item].sort((a, b) => a.position - b.position);
}

export function removeRoomQueueItems(
  current: RoomQueueItem[] | null,
  itemIds: string[]
) {
  if (!current) return current;
  if (itemIds.length === 0) return current;

  const removedIds = new Set(itemIds);
  return current.filter((item) => !removedIds.has(item.id));
}

export function toRoomChatMessage({
  id,
  sender,
  text,
  createdAt,
}: {
  id: string;
  sender: RoomChatMessage["sender"];
  text: string;
  createdAt: string;
}): RoomChatMessage {
  return {
    id,
    sender,
    text,
    createdAt,
  };
}

export function insertRoomMessagePage(
  current: InfiniteData<RoomMessagesPage> | undefined,
  message: RoomChatMessage
): InfiniteData<RoomMessagesPage> {
  const base =
    current ??
    ({
      pages: [{ messages: [], nextCursor: null }],
      pageParams: [undefined],
    } satisfies InfiniteData<RoomMessagesPage>);

  const nextPages =
    base.pages.length > 0
      ? [...base.pages]
      : [{ messages: [], nextCursor: null }];

  const firstPage = nextPages[0];
  if (firstPage.messages.some((item) => item.id === message.id)) {
    return base;
  }

  nextPages[0] = {
    ...firstPage,
    messages: insertRoomMessage(firstPage.messages, message),
  };

  return { ...base, pages: nextPages };
}

export function getRoomAccessRequiredChatError(reason: string) {
  return reason === "Join room before connecting"
    ? "Join the room from Discover first."
    : "Room access required. Join again to chat.";
}
