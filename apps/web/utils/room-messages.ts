import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";

export function mergeRoomMessagePages(
  pages: { messages: RoomChatMessage[] }[]
): RoomChatMessage[] {
  if (pages.length === 0) return [];

  const ordered: RoomChatMessage[] = [];
  const seen = new Set<string>();

  for (const page of pages.slice().reverse()) {
    for (const message of page.messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      ordered.push(message);
    }
  }

  return ordered;
}
