"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ApiError, leaveRoom } from "@/api/rooms";
import { useFetchRoom } from "@/hooks/use-fetch-room";
import { authClient } from "@/lib/auth-client";

import { useRoomRealtime } from "@/hooks/use-room-realtime";
import RoomChatCard from "./_components/room-chat-card";
import RoomInfoSidebarCard from "./_components/room-info-sidebar-card";
import RoomNowPlayingCard from "./_components/room-now-playing-card";
import RoomPageHeader from "./_components/room-page-header";

export default function RoomPage() {
  const routeParams = useParams<{ roomId?: string | string[] }>();
  const roomId = useMemo(() => {
    return typeof routeParams.roomId === "string"
      ? routeParams.roomId
      : Array.isArray(routeParams.roomId)
        ? (routeParams.roomId[0] ?? "unknown")
        : "unknown";
  }, [routeParams.roomId]);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const sessionUserId = session?.user?.id ?? null;

  const [musicQuery, setMusicQuery] = useState("");

  const [chatError, setChatError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const roomQuery = useFetchRoom(roomId);
  const room = roomQuery.data ?? null;
  const isLoadingRoom = roomQuery.isFetching && !roomQuery.data;

  const roomApiError =
    roomQuery.error instanceof ApiError ? roomQuery.error : null;
  const isRoomNotFound = roomApiError?.status === 404;
  const requiresRoomAccess =
    roomApiError?.status === 401 || roomApiError?.status === 403;

  const roomReady = !!room && !isRoomNotFound && !requiresRoomAccess;

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!roomId || roomId === "unknown") throw new Error("Missing room id");
      return await leaveRoom(roomId);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });

      router.replace(
        "disbanded" in result && result.disbanded
          ? "/discover?toast=disbanded"
          : "/discover"
      );
    },
  });

  const isLeaving = leaveMutation.isPending;
  const handleLeave = useCallback(() => {
    if (leaveMutation.isPending) return;
    leaveMutation.mutate();
  }, [leaveMutation]);

  const { participants, wsStatus, wsStatusDetail, sendChat } = useRoomRealtime({
    roomId,
    enabled: roomReady,
    sessionUserId,
    onChatError: setChatError,
    onAnnouncement: setLiveAnnouncement,
    onAccessRequired: () => {
      router.replace("/discover?toast=password_required");
    },
  });

  const roomName =
    room?.name ??
    (isRoomNotFound
      ? "Room not found"
      : requiresRoomAccess
        ? "Private room"
        : "Room");
  const hostName = room?.host.name ?? "Unknown";
  const visibility =
    room?.visibility ?? (requiresRoomAccess && !room ? "private" : "public");

  const participantStats = room?.participants ?? null;
  const participantCurrent =
    wsStatus === "connected"
      ? participants.length
      : (participantStats?.current ?? null);
  const participantCapacity = participantStats?.capacity ?? null;
  const nowPlaying = room?.nowPlaying ?? null;

  const leaveDisabled =
    isLeaving ||
    isSessionPending ||
    !sessionUserId ||
    requiresRoomAccess ||
    isRoomNotFound;

  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <RoomPageHeader
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
                roomId={roomId}
                roomName={roomName}
                hostName={hostName}
                visibility={visibility}
                participantCurrent={participantCurrent}
                participantCapacity={participantCapacity}
                isLoadingRoom={isLoadingRoom}
                sessionUserId={sessionUserId}
                filteredParticipants={participants}
                wsStatus={wsStatus}
                wsStatusDetail={wsStatusDetail}
                onLeave={handleLeave}
                leaveDisabled={leaveDisabled}
                isLeaving={isLeaving}
              />
            </div>

            <div className="space-y-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <RoomNowPlayingCard nowPlaying={nowPlaying} />

              <RoomChatCard
                roomId={roomId}
                roomReady={roomReady}
                isRoomNotFound={isRoomNotFound}
                requiresRoomAccess={requiresRoomAccess}
                roomApiErrorMessage={roomApiError?.message ?? null}
                sessionUserId={sessionUserId}
                wsStatus={wsStatus}
                wsStatusDetail={wsStatusDetail}
                sendChat={sendChat}
                chatError={chatError}
                setChatError={setChatError}
                liveAnnouncement={liveAnnouncement}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
