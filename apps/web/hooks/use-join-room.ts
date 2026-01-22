"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

import { ApiError, joinRoom } from "@/api/rooms";

export type JoinRoomResult =
  | { ok: true }
  | { ok: false; requiresPassword: true; error: string }
  | { ok: false; requiresPassword: false; error: string };

export function useJoinRoom() {
  const mutation = useMutation({
    mutationFn: async ({
      roomId,
      password,
    }: {
      roomId: string;
      password?: string;
    }) => {
      return await joinRoom(roomId, { password });
    },
  });

  const attemptJoin = useCallback(
    async (roomId: string, password?: string): Promise<JoinRoomResult> => {
      try {
        await mutation.mutateAsync({ roomId, password });
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to join room.";

        const requiresPassword =
          error instanceof ApiError &&
          error.status === 400 &&
          message.toLowerCase().includes("password");

        return {
          ok: false,
          requiresPassword,
          error: message,
        };
      }
    },
    [mutation]
  );

  return { attemptJoin, isJoining: mutation.isPending };
}
