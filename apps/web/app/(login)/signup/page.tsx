"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

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

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitSignUp = useCallback(async () => {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/",
      });

      if (error) {
        setError(error.message ?? "Sign up failed.");
        setIsSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign up failed.");
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, name, password, router]);

  const handleSignUpSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitSignUp();
    },
    [submitSignUp]
  );

  return (
    <Card className="w-full max-w-md border border-white/70 bg-white/85 backdrop-blur">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Choose a display name, then set your email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSignUpSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

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
              autoComplete="new-password"
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary font-semibold">
              Sign in
            </Link>
            .
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
