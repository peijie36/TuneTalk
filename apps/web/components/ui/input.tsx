import * as React from "react";

import { cn } from "@/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "border-border placeholder:text-muted-foreground focus-visible:ring-offset-background text-text focus-visible:ring-primary-muted rounded-input flex h-11 w-full border bg-white px-3 py-2 text-sm shadow-sm transition-[border,box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
