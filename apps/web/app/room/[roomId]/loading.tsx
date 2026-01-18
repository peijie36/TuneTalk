import AppHeader from "@/components/layout/app-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoomLoading() {
  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <AppHeader containerClassName="flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <Skeleton className="order-2 h-12 w-full rounded-full bg-white/55 sm:order-1 sm:max-w-[360px]" />
        <div className="order-1 flex flex-wrap items-center justify-center gap-3 sm:order-2">
          <Skeleton className="h-11 w-24 rounded-full bg-white/55" />
          <Skeleton className="h-11 w-28 rounded-full bg-white/55" />
          <Skeleton className="h-11 w-24 rounded-full bg-white/55" />
        </div>
        <Skeleton className="order-3 h-12 w-56 rounded-full bg-white/55" />
      </AppHeader>

      <main className="tt-container pb-16">
        <section className="rounded-[34px] bg-black/55 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:items-start">
            <div className="space-y-6">
              <Skeleton className="h-[520px] rounded-[28px] bg-white/30" />
              <Skeleton className="h-[92px] rounded-[22px] bg-white/30" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[260px] rounded-[28px] bg-white/30" />
              <Skeleton className="h-[520px] rounded-[28px] bg-white/30" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
