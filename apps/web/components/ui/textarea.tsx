import * as React from "react";

import { cn } from "@/utils/cn";

export type TextareaProps = React.InputHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "border-border placeholder:text-muted-foreground focus-visible:ring-offset-background text-text focus-visible:ring-primary-muted rounded-input flex min-h-[120px] w-full border bg-white px-3 py-2 text-sm shadow-sm transition-[border,box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
