import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tt-container flex min-h-screen flex-col py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-foreground text-xl font-semibold">
          TuneTalk
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Back home</Link>
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center py-12">
        {children}
      </main>
    </div>
  );
}
