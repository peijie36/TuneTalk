"use client";

import { memo } from "react";

import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";

import RoomMusicSearch from "./room-music-search";

interface RoomPageHeaderProps {
  roomId: string;
}

function RoomPageHeader({ roomId }: RoomPageHeaderProps) {
  return (
    <AppHeader containerClassName="relative flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
      <RoomMusicSearch roomId={roomId} />

      <PrimaryNav className="order-2 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" />

      <div className="order-3 flex items-center justify-end">
        <AuthButtons />
      </div>
    </AppHeader>
  );
}

export default memo(RoomPageHeader);
