"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { ApiError, leaveRoom } from "@/api/rooms";
import { useFetchRoom } from "@/hooks/use-fetch-room";
import { useRoomChatUiState } from "@/hooks/use-room-chat-ui-state";
import { useRoomQueueState } from "@/hooks/use-room-queue-state";
import { useRoomRealtime } from "@/hooks/use-room-realtime";
import { authClient } from "@/lib/auth-client";
import { useHostRoomResumeStore } from "@/stores/host-room-resume";

function getRoomId(routeRoomId?: string | string[]) {
  if (typeof routeRoomId === "string") return routeRoomId;
  if (Array.isArray(routeRoomId)) return routeRoomId[0] ?? "unknown";
  return "unknown";
}

export function useRoomPageState() {
  const routeParams = useParams<{ roomId?: string | string[] }>();
  const roomId = useMemo(
    () => getRoomId(routeParams.roomId),
    [routeParams.roomId]
  );

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const sessionUserId = session?.user?.id ?? null;
  const setHostedRoom = useHostRoomResumeStore((state) => state.setHostedRoom);
  const clearHostedRoom = useHostRoomResumeStore(
    (state) => state.clearHostedRoom
  );
  const chatUiState = useRoomChatUiState();

  const leavingIntentRef = useRef(false);

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
    onError: () => {
      leavingIntentRef.current = false;
    },
    onSuccess: (result) => {
      clearHostedRoom();
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });

      router.replace(
        "disbanded" in result && result.disbanded
          ? "/discover?toast=disbanded"
          : "/discover"
      );
    },
  });

  const isLeaving = leaveMutation.isPending;
  const handleRealtimeAccessRequired = useCallback(
    (reason: string) => {
      if (leavingIntentRef.current) return;
      if (reason === "Join room before connecting") {
        router.replace("/discover?toast=join_required");
        return;
      }
      router.replace("/discover?toast=password_required");
    },
    [router]
  );

  const handleLeave = useCallback(() => {
    if (leaveMutation.isPending) return;
    leavingIntentRef.current = true;
    leaveMutation.mutate();
  }, [leaveMutation]);

  const realtimeEnabled = roomReady && !isLeaving;
  const {
    participants,
    wsStatus,
    wsStatusDetail,
    sendChat,
    playbackState,
    queueState,
  } = useRoomRealtime({
    roomId,
    enabled: realtimeEnabled,
    sessionUserId,
    onChatError: chatUiState.setChatError,
    onAnnouncement: chatUiState.setLiveAnnouncement,
    onAccessRequired: handleRealtimeAccessRequired,
    onRoomDisbanded: clearHostedRoom,
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
  const isHost = participants.some(
    (participant) =>
      participant.id === sessionUserId && participant.role === "host"
  );

  const queue = useRoomQueueState({
    roomId,
    roomReady,
    queueState,
    playbackQueueItemId: playbackState?.queueItemId ?? null,
  });

  useEffect(() => {
    if (!roomReady || !isHost || !sessionUserId || !room) return;
    setHostedRoom({
      roomId,
      roomName: room.name,
      hostUserId: sessionUserId,
    });
  }, [isHost, room, roomId, roomReady, sessionUserId, setHostedRoom]);

  const leaveDisabled =
    isLeaving ||
    isSessionPending ||
    !sessionUserId ||
    requiresRoomAccess ||
    isRoomNotFound;

  return {
    roomId,
    roomName,
    hostName,
    visibility,
    sessionUserId,
    isLoadingRoom,
    isRoomNotFound,
    requiresRoomAccess,
    roomApiErrorMessage: roomApiError?.message ?? null,
    participantCurrent,
    participantCapacity,
    participants,
    wsStatus,
    wsStatusDetail,
    queue,
    playbackState,
    isHost,
    onLeave: handleLeave,
    leaveDisabled,
    isLeaving,
    realtimeEnabled,
    sendChat,
    chatUiState,
  };
}
