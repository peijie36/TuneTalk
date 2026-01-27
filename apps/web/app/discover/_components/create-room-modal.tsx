"use client";

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateRoomModalProps {
  open: boolean;
  name: string;
  isPublic: boolean;
  password: string;
  error: string | null;
  isCreating: boolean;
  onNameChange: (value: string) => void;
  onIsPublicChange: (value: boolean) => void;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function CreateRoomModal({
  open,
  name,
  isPublic,
  password,
  error,
  isCreating,
  onNameChange,
  onIsPublicChange,
  onPasswordChange,
  onCancel,
  onSubmit,
}: CreateRoomModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const canSubmit =
    !isCreating && !!name.trim() && (isPublic || password.trim().length >= 8);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (!canSubmit) return;
      onSubmit();
    },
    [canSubmit, onSubmit]
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dialogRef.current?.contains(target)) return;
      onCancel();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="Create room"
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        className="border-border/70 relative w-full max-w-lg rounded-[28px] border bg-white/85 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-text-strong text-lg font-semibold">
                Create a room
              </p>
              <p className="text-muted-foreground text-sm">
                Configure your room and invite listeners.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isCreating}
            >
              Close
            </Button>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="create-room-name"
              className="text-text-strong text-sm font-medium"
            >
              Name
            </label>
            <Input
              id="create-room-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isCreating}
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="text-text-strong text-sm font-medium">
              Visibility
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={isPublic ? "default" : "secondary"}
                onClick={() => onIsPublicChange(true)}
                disabled={isCreating}
              >
                Public
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!isPublic ? "default" : "secondary"}
                onClick={() => onIsPublicChange(false)}
                disabled={isCreating}
              >
                Private
              </Button>
            </div>
            {!isPublic ? (
              <p className="text-muted-foreground text-sm">
                Private rooms require a password to join.
              </p>
            ) : null}
          </div>

          {!isPublic ? (
            <div className="space-y-2">
              <label
                htmlFor="create-room-password"
                className="text-text-strong text-sm font-medium"
              >
                Password
              </label>
              <Input
                id="create-room-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                onKeyDown={handleInputKeyDown}
                disabled={isCreating}
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <p className="text-muted-foreground text-xs">
                Required for private rooms (min 8 characters).
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="text-destructive text-sm font-medium">{error}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
              {isCreating ? "Creating..." : "Create room"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
