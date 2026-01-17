import { Skeleton } from "@/components/ui/skeleton";

const ROOMS_PER_PAGE = 5;

export default function DiscoverLoading() {
  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <div className="tt-container flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Skeleton className="order-2 h-12 w-full rounded-full bg-white/55 sm:order-1 sm:max-w-[360px]" />
        <div className="order-1 flex flex-wrap items-center justify-center gap-3 sm:order-2">
          <Skeleton className="h-11 w-28 rounded-full bg-white/55" />
          <Skeleton className="h-11 w-28 rounded-full bg-white/55" />
          <Skeleton className="h-11 w-28 rounded-full bg-white/55" />
        </div>
        <Skeleton className="order-3 h-12 w-52 rounded-full bg-white/55" />
      </div>

      <main className="tt-container pb-16">
        <section className="rounded-[34px] bg-black/55 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:grid-rows-[auto_1fr] lg:items-start">
            <div className="lg:col-start-1 lg:row-start-2">
              <Skeleton className="h-[400px] rounded-[28px] bg-white/30 lg:h-[460px]" />
            </div>

            <div className="space-y-4 lg:col-start-2 lg:row-start-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-10 w-20 rounded-full bg-white/40" />
                  <Skeleton className="h-10 w-20 rounded-full bg-white/40" />
                  <Skeleton className="h-10 w-24 rounded-full bg-white/40" />
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-start-2 lg:row-start-2">
              {Array.from({ length: ROOMS_PER_PAGE }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-[108px] rounded-3xl bg-white/55"
                />
              ))}

              <div className="pt-6">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Skeleton className="h-12 w-32 rounded-full bg-white/30" />
                  <Skeleton className="h-12 w-32 rounded-full bg-white/30" />
                  <Skeleton className="h-12 w-32 rounded-full bg-white/30" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
