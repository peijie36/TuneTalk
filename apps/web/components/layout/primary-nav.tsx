"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const PRIMARY_NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Discover", href: "/discover" },
] as const;

export default function PrimaryNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className={cn(className)}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Button
              key={item.label}
              asChild
              variant={isActive ? "default" : "secondary"}
              size="sm"
              className={cn(
                "h-11 px-7",
                isActive
                  ? "shadow-[0_12px_28px_rgba(160,61,240,0.25)]"
                  : "bg-white/55 backdrop-blur"
              )}
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
