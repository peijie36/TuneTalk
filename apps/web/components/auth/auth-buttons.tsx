"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function AuthButtons() {
  const router = useRouter();
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
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground hidden text-sm sm:block">
        {session.user.name ?? session.user.email}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void authClient.signOut().then(() => {
            router.refresh();
          });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
