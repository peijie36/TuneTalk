"use client";

import Link from "next/link";

import UserMenu from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function AuthButtons() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" disabled>
          Sign in
        </Button>
        <Button size="sm" disabled>
          Create account
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/signin">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">Create account</Link>
        </Button>
      </div>
    );
  }

  return (
    <UserMenu
      displayName={session.user.name ?? session.user.email}
      email={session.user.email}
    />
  );
}
