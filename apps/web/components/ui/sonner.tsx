"use client";

import * as React from "react";

import { Toaster as Sonner } from "sonner";

import { cn } from "@/utils/cn";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ className, ...props }: ToasterProps) {
  return (
    <Sonner
      className={cn("toaster group", className)}
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover/85 group-[.toaster]:text-popover-foreground group-[.toaster]:border-border/70 group-[.toaster]:backdrop-blur group-[.toaster]:shadow-[0_18px_40px_rgba(0,0,0,0.16)] group-[.toaster]:rounded-2xl group-[.toaster]:border",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground",
        },
      }}
      {...props}
    />
  );
}
