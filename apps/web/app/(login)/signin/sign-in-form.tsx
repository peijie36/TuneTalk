"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function SignInForm({ callbackURL }: { callbackURL: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    return (
      <Card className="w-full max-w-md border border-white/70 bg-white/85 backdrop-blur">
        <CardHeader>
          <CardTitle>You’re signed in</CardTitle>
          <CardDescription>
            Continue back to the app, or sign out to switch accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() => {
              router.push(callbackURL);
            }}
          >
            Continue
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void authClient.signOut().then(() => {
                router.refresh();
              });
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border border-white/70 bg-white/85 backdrop-blur">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Welcome back. Use your email and password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              setError(null);
              setIsSubmitting(true);

              const { error } = await authClient.signIn.email({
                email,
                password,
                callbackURL,
              });

              if (error) {
                setError(error.message ?? "Sign in failed.");
                setIsSubmitting(false);
                return;
              }

              router.push(callbackURL);
              router.refresh();
            })();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm font-medium">{error}</p>
          ) : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-muted-foreground text-sm">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold">
              Create one
            </Link>
            .
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
