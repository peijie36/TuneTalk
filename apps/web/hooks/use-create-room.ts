"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { ApiError, createRoom } from "@/api/rooms";

type CreateRoomResult = { ok: true; id: string } | { ok: false; error: string };

export function useCreateRoom() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    isPending: isCreating,
    mutateAsync: createRoomMutation,
    reset: resetMutation,
  } = useMutation({
    mutationFn: async ({
      roomName,
      isPublic,
      password,
    }: {
      roomName: string;
      isPublic: boolean;
      password?: string;
    }) => {
      return await createRoom({
        name: roomName,
        isPublic,
        password,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const reset = useCallback(() => {
    setName("My Room");
    setIsPublic(true);
    setPassword("");
    setError(null);
    resetMutation();
  }, [resetMutation]);

  const openModal = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setError(null);
    resetMutation();
  }, [resetMutation]);

  const submit = useCallback(async (): Promise<CreateRoomResult> => {
    if (isCreating) return { ok: false, error: "Already creating." };

    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError("Room name must be at least 3 characters.");
      return { ok: false, error: "Room name must be at least 3 characters." };
    }

    if (!isPublic) {
      const passwordTrimmed = password.trim();
      if (passwordTrimmed.length < 8) {
        setError("Password must be at least 8 characters.");
        return { ok: false, error: "Password must be at least 8 characters." };
      }
    }

    setError(null);

    try {
      const result = await createRoomMutation({
        roomName: trimmed,
        isPublic,
        password: isPublic ? undefined : password.trim(),
      });
      setOpen(false);
      return { ok: true, id: result.id };
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to create room.";
      setError(message);
      return { ok: false, error: message };
    }
  }, [createRoomMutation, isCreating, isPublic, name, password]);

  return {
    open,
    openModal,
    closeModal,
    submit,
    name,
    setName,
    isPublic,
    setIsPublic,
    password,
    setPassword,
    error,
    isCreating,
  };
}
