"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";

import type { RoomChatMessage } from "@tunetalk/shared/room-realtime";

import type { RoomWebSocketStatus } from "@/hooks/use-room-realtime";
import { isNearBottom } from "@/utils/room-realtime-utils";

export function useRoomChatListState({
  messages,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  wsStatus,
}: {
  messages: RoomChatMessage[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  wsStatus: RoomWebSocketStatus;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const chatVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => chatScrollRef.current,
    estimateSize: () => 104,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el || (!shouldStickToBottomRef.current && !isNearBottom(el))) return;
    shouldStickToBottomRef.current = true;

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [messages.length]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length <= prev) return;

    if (shouldStickToBottomRef.current) {
      setUnreadCount(0);
      return;
    }

    setUnreadCount((count) => count + (messages.length - prev));
  }, [messages.length]);

  useEffect(() => {
    if (wsStatus !== "connected") return;
    shouldStickToBottomRef.current = true;
    setUnreadCount(0);
  }, [wsStatus]);

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    shouldStickToBottomRef.current = isNearBottom(el);
    if (shouldStickToBottomRef.current) setUnreadCount(0);
  }, []);

  const handleLoadOlder = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    const el = chatScrollRef.current;
    if (!el) {
      await fetchNextPage();
      return;
    }

    shouldStickToBottomRef.current = false;
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    await fetchNextPage();

    requestAnimationFrame(() => {
      const nextScrollHeight = el.scrollHeight;
      el.scrollTop = prevScrollTop + (nextScrollHeight - prevScrollHeight);
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleJumpToLatest = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    shouldStickToBottomRef.current = true;
    setUnreadCount(0);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  return {
    chatScrollRef,
    chatVirtualizer,
    unreadCount,
    handleChatScroll,
    handleJumpToLatest,
    handleLoadOlder,
  };
}
