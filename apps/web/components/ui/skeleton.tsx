import * as React from "react";

import { cn } from "@/utils/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-foreground/10 animate-pulse rounded-xl", className)}
      {...props}
    />
  );
}

export { Skeleton };
