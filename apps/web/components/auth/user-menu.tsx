"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export default function UserMenu({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      setOpen(false);
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="border-border/80 text-text-strong focus-visible:ring-ring focus-visible:ring-offset-background inline-flex cursor-pointer items-center gap-3 rounded-full border bg-white/75 px-4 py-2.5 shadow-sm backdrop-blur transition-colors hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <Avatar className="h-9 w-9 border border-white/60">
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="hidden min-w-0 flex-col text-left sm:flex">
          <span className="max-w-[10rem] truncate text-sm leading-none font-semibold">
            {displayName}
          </span>
          <span className="text-muted-foreground max-w-[10rem] truncate text-xs leading-tight">
            {email}
          </span>
        </div>
        <ChevronDown className="text-muted-foreground h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="border-border/70 absolute right-0 z-50 mt-3 w-[240px] rounded-2xl border bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="px-3 py-2">
            <div className="text-text-strong truncate text-sm font-semibold">
              {displayName}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {email}
            </div>
          </div>

          <div className="border-border/60 my-2 border-t" />

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            role="menuitem"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
