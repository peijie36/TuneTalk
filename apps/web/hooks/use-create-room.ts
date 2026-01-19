"use client";

import { useCallback, useState } from "react";

import { API_BASE_URL } from "@/lib/constants";

type CreateRoomResult = { ok: true; id: string } | { ok: false; error: string };

export function useCreateRoom() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const reset = useCallback(() => {
    setName("My Room");
    setIsPublic(true);
    setPassword("");
    setError(null);
    setIsCreating(false);
  }, []);

  const openModal = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setError(null);
    setIsCreating(false);
  }, []);

  const submit = useCallback(async (): Promise<CreateRoomResult> => {
    if (isCreating) return { ok: false, error: "Already creating." };

    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError("Room name must be at least 3 characters.");
      return { ok: false, error: "Room name must be at least 3 characters." };
    }

    if (!isPublic) {
      setError("Private rooms aren't supported yet.");
      return { ok: false, error: "Private rooms aren't supported yet." };
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          isPublic,
          password: password || undefined,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      const createdId =
        payload &&
        typeof payload === "object" &&
        typeof (payload as { id?: unknown }).id === "string"
          ? (payload as { id: string }).id
          : null;

      if (!response.ok || !createdId) {
        const serverError =
          payload &&
          typeof payload === "object" &&
          typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : null;
        throw new Error(
          serverError ?? `Failed to create room (${response.status})`
        );
      }

      setOpen(false);
      setIsCreating(false);
      return { ok: true, id: createdId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create room.";
      setError(message);
      setIsCreating(false);
      return { ok: false, error: message };
    }
  }, [isCreating, isPublic, name, password]);

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
