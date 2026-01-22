"use client";

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinPrivateRoomModalProps {
  open: boolean;
  roomName: string;
  password: string;
  error: string | null;
  isJoining: boolean;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function JoinPrivateRoomModal({
  open,
  roomName,
  password,
  error,
  isJoining,
  onPasswordChange,
  onCancel,
  onSubmit,
}: JoinPrivateRoomModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = password.trim().length >= 8 && !isJoining;

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
      aria-label="Join private room"
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
                Join {roomName}
              </p>
              <p className="text-muted-foreground text-sm">
                This room is private. Enter the password to join.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isJoining}
            >
              Close
            </Button>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="join-room-password"
              className="text-text-strong text-sm font-medium"
            >
              Password
            </label>
            <Input
              id="join-room-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isJoining}
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              autoFocus
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm font-medium">{error}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
              {isJoining ? "Joining..." : "Join room"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
