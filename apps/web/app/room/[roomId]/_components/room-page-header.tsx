"use client";

import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import { Input } from "@/components/ui/input";

type RoomPageHeaderProps = {
  musicQuery: string;
  onMusicQueryChange: (value: string) => void;
};

export default function RoomPageHeader({
  musicQuery,
  onMusicQueryChange,
}: RoomPageHeaderProps) {
  return (
    <AppHeader containerClassName="relative flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
      <div className="order-1 w-full sm:max-w-[360px]">
        <label htmlFor="music-search" className="sr-only">
          Search music
        </label>
        <Input
          id="music-search"
          value={musicQuery}
          onChange={(event) => onMusicQueryChange(event.target.value)}
          placeholder="Search music..."
          className="h-12 rounded-full bg-white/75 px-5 shadow-sm backdrop-blur"
        />
      </div>

      <PrimaryNav className="order-2 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" />

      <div className="order-3 flex items-center justify-end">
        <AuthButtons />
      </div>
    </AppHeader>
  );
}
