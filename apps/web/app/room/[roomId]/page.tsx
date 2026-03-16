"use client";

import { useState } from "react";

import { useRoomPageState } from "@/hooks/use-room-page-state";
import RoomChatCard from "./_components/room-chat-card";
import RoomInfoSidebarCard from "./_components/room-info-sidebar-card";
import RoomNowPlayingCard from "./_components/room-now-playing-card";
import RoomPageHeader from "./_components/room-page-header";

export default function RoomPage() {
  const [musicQuery, setMusicQuery] = useState("");
  const roomPage = useRoomPageState();

  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <RoomPageHeader
        roomId={roomPage.roomId}
        musicQuery={musicQuery}
        onMusicQueryChange={setMusicQuery}
      />

      <main className="tt-container pb-10 lg:pb-6">
        <section
          aria-label="Room"
          className="rounded-[34px] bg-black/55 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8 lg:h-[calc(100dvh-8.5rem)] lg:overflow-hidden lg:p-10"
        >
          <div className="grid gap-8 lg:h-full lg:min-h-0 lg:grid-cols-[340px_1fr] lg:items-start">
            <div className="space-y-6 lg:min-h-0">
              <RoomInfoSidebarCard
                roomId={roomPage.roomId}
                roomName={roomPage.roomName}
                hostName={roomPage.hostName}
                visibility={roomPage.visibility}
                participantCurrent={roomPage.participantCurrent}
                participantCapacity={roomPage.participantCapacity}
                isLoadingRoom={roomPage.isLoadingRoom}
                sessionUserId={roomPage.sessionUserId}
                filteredParticipants={roomPage.participants}
                wsStatus={roomPage.wsStatus}
                wsStatusDetail={roomPage.wsStatusDetail}
                onLeave={roomPage.onLeave}
                leaveDisabled={roomPage.leaveDisabled}
                isLeaving={roomPage.isLeaving}
              />
            </div>

            <div className="space-y-5 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <RoomNowPlayingCard
                roomId={roomPage.roomId}
                queue={roomPage.queue}
                playbackState={roomPage.playbackState}
                isHost={roomPage.isHost}
              />

              <div className="flex min-h-0 flex-1 flex-col">
                <RoomChatCard
                  roomId={roomPage.roomId}
                  roomReady={roomPage.realtimeEnabled}
                  isRoomNotFound={roomPage.isRoomNotFound}
                  requiresRoomAccess={roomPage.requiresRoomAccess}
                  roomApiErrorMessage={roomPage.roomApiErrorMessage}
                  sessionUserId={roomPage.sessionUserId}
                  wsStatus={roomPage.wsStatus}
                  wsStatusDetail={roomPage.wsStatusDetail}
                  sendChat={roomPage.sendChat}
                  chatError={roomPage.chatError}
                  setChatError={roomPage.setChatError}
                  liveAnnouncement={roomPage.liveAnnouncement}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
