import { cn } from "@/utils/cn";

export default function AppHeader({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <header
      className={cn(
        "border-border/60 sticky top-0 z-30 border-b bg-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.04)] backdrop-blur-lg supports-backdrop-filter:bg-white/80",
        className
      )}
    >
      <div className={cn("tt-container", containerClassName)}>{children}</div>
    </header>
  );
}
