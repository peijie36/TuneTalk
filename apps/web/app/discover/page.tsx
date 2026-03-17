"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RefreshCcw, Search, X } from "lucide-react";
import { toast } from "sonner";

import type { RoomSummary } from "@tunetalk/shared/rooms";

import { ApiError, getRoom } from "@/api/rooms";
import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/hooks/use-create-room";
import { useFetchRoomList } from "@/hooks/use-fetch-room-list";
import { useJoinRoom } from "@/hooks/use-join-room";
import { authClient } from "@/lib/auth-client";
import { useHostRoomResumeStore } from "@/stores/host-room-resume";
import { cn } from "@/utils/cn";

import CreateRoomModal from "./_components/create-room-modal";
import JoinPrivateRoomModal from "./_components/join-private-room-modal";
import RoomRow from "./_components/room-row";
import ServerInfoPanel from "./_components/server-info-panel";

type RoomFilter = "all" | "public" | "private";

const ROOMS_PER_PAGE = 5;

const FILTER_OPTIONS: readonly { value: RoomFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const DiscoverResumeBanner = memo(function DiscoverResumeBanner({
  resumeHostedRoom,
  onResumeHostedRoom,
}: {
  resumeHostedRoom: { id: string; name: string } | null;
  onResumeHostedRoom: () => void;
}) {
  if (!resumeHostedRoom) return null;

  return (
    <div className="border-border/70 flex flex-col gap-3 rounded-3xl border bg-white/75 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-text-strong text-sm font-semibold">
          Resume hosting room
        </p>
        <p className="text-muted-foreground truncate text-sm">
          {resumeHostedRoom.name}
        </p>
      </div>
      <Button type="button" className="h-11 px-6" onClick={onResumeHostedRoom}>
        Resume
      </Button>
    </div>
  );
});

const DiscoverFilterBar = memo(function DiscoverFilterBar({
  filter,
  query,
  onFilterChange,
}: {
  filter: RoomFilter;
  query: string;
  onFilterChange: (value: RoomFilter) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? "default" : "secondary"}
              className={cn(
                "h-10 px-5",
                filter === option.value ? "" : "bg-white/55 backdrop-blur"
              )}
              aria-pressed={filter === option.value}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground text-sm" aria-live="polite">
        {query ? (
          <>
            Results for{" "}
            <span className="text-text-strong font-semibold">
              {"\u201C"}
              {query}
              {"\u201D"}
            </span>
          </>
        ) : null}
      </div>
    </>
  );
});

const DiscoverRoomList = memo(function DiscoverRoomList({
  rooms,
  selectedRoomId,
  joiningRoomId,
  onSelectRoom,
  onJoinRoom,
  onReset,
}: {
  rooms: RoomSummary[];
  selectedRoomId: string;
  joiningRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      {rooms.length === 0 ? (
        <div className="border-border/70 rounded-[26px] border bg-white/70 backdrop-blur">
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-text-strong text-base font-semibold">
              No rooms match your search
            </p>
            <p className="text-muted-foreground text-sm">
              Try a different query or reset filters.
            </p>
            <Button type="button" variant="secondary" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      ) : (
        rooms.map((room) => (
          <RoomRow
            key={room.id}
            room={room}
            isSelected={room.id === selectedRoomId}
            isJoining={room.id === joiningRoomId}
            onSelect={onSelectRoom}
            onJoin={onJoinRoom}
          />
        ))
      )}
    </div>
  );
});

const DiscoverPagination = memo(function DiscoverPagination({
  pageIndex,
  pageCount,
  pageCountLabel,
  hasMoreRooms,
  isRoomsFetchingMore,
  onPrevPage,
  onNextPage,
}: {
  pageIndex: number;
  pageCount: number;
  pageCountLabel: string;
  hasMoreRooms: boolean;
  isRoomsFetchingMore: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  if (!(pageCount > 1 || hasMoreRooms)) return null;

  return (
    <nav
      aria-label="Room pages"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-muted-foreground text-sm">
        Page{" "}
        <span className="text-text-strong font-semibold">{pageIndex + 1}</span>{" "}
        of{" "}
        <span className="text-text-strong font-semibold">{pageCountLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onPrevPage}
          disabled={pageIndex === 0}
          className="h-10 px-5"
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onNextPage}
          disabled={
            (!hasMoreRooms && pageIndex >= pageCount - 1) || isRoomsFetchingMore
          }
          className="h-10 px-5"
        >
          {isRoomsFetchingMore ? "Loading..." : "Next"}
        </Button>
      </div>
    </nav>
  );
});

const DiscoverActionBar = memo(function DiscoverActionBar({
  isSessionPending,
  canJoinSelected,
  isJoiningSelected,
  isRoomsFetching,
  onCreate,
  onJoinSelected,
  onRefresh,
}: {
  isSessionPending: boolean;
  canJoinSelected: boolean;
  isJoiningSelected: boolean;
  isRoomsFetching: boolean;
  onCreate: () => void;
  onJoinSelected: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="border-border/60 border-t pt-6">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          type="button"
          variant="secondary"
          className="h-12 px-8"
          onClick={onCreate}
          disabled={isSessionPending}
        >
          Create
        </Button>
        <Button
          type="button"
          className="h-12 px-10"
          disabled={!canJoinSelected || isJoiningSelected}
          onClick={onJoinSelected}
        >
          {isJoiningSelected ? "Joining..." : "Join"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-12 px-8"
          onClick={onRefresh}
          disabled={isRoomsFetching}
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>
    </div>
  );
});

export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const persistedHostedRoomId = useHostRoomResumeStore((state) => state.roomId);
  const persistedHostedRoomName = useHostRoomResumeStore(
    (state) => state.roomName
  );
  const persistedHostUserId = useHostRoomResumeStore(
    (state) => state.hostUserId
  );
  const clearHostedRoom = useHostRoomResumeStore(
    (state) => state.clearHostedRoom
  );

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [resumeHostedRoom, setResumeHostedRoom] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    rooms,
    isFetching: isRoomsFetching,
    isFetchingMore: isRoomsFetchingMore,
    hasMore: hasMoreRooms,
    refresh: refreshRooms,
    loadMore: loadMoreRooms,
  } = useFetchRoomList({
    query: deferredQuery,
    visibility: filter,
    pageSize: ROOMS_PER_PAGE,
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const createRoom = useCreateRoom();

  const joinRoom = useJoinRoom();
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [joinModalRoomId, setJoinModalRoomId] = useState<string | null>(null);
  const [joinModalRoomName, setJoinModalRoomName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const handledToastKeyRef = useRef<string | null>(null);

  const closeJoinModal = useCallback(() => {
    setJoinModalRoomId(null);
    setJoinModalRoomName("");
    setJoinPassword("");
    setJoinError(null);
  }, []);

  const handleJoinPasswordChange = useCallback((value: string) => {
    setJoinPassword(value);
    setJoinError(null);
  }, []);

  useEffect(() => {
    const firstRoomId = rooms.at(0)?.id ?? "";
    if (!firstRoomId) return;

    if (!selectedRoomId) {
      setSelectedRoomId(firstRoomId);
      return;
    }

    const exists = rooms.some((room) => room.id === selectedRoomId);
    if (!exists) setSelectedRoomId(firstRoomId);
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (isSessionPending) return;

    const sessionUserId = session?.user?.id ?? null;
    if (!sessionUserId) {
      setResumeHostedRoom(null);
      clearHostedRoom();
      return;
    }

    if (!persistedHostedRoomId || !persistedHostUserId) {
      setResumeHostedRoom(null);
      return;
    }

    if (persistedHostUserId !== sessionUserId) {
      setResumeHostedRoom(null);
      clearHostedRoom();
      return;
    }

    const abortController = new AbortController();

    void getRoom(persistedHostedRoomId, { signal: abortController.signal })
      .then((room) => {
        if (abortController.signal.aborted) return;
        setResumeHostedRoom({
          id: room.id,
          name: persistedHostedRoomName ?? room.name,
        });
      })
      .catch((error) => {
        if (abortController.signal.aborted) return;

        setResumeHostedRoom(null);
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          clearHostedRoom();
        }
      });

    return () => {
      abortController.abort();
    };
  }, [
    clearHostedRoom,
    isSessionPending,
    persistedHostedRoomId,
    persistedHostedRoomName,
    persistedHostUserId,
    session?.user?.id,
  ]);

  const roomLookup = useMemo(
    () => new Map<string, RoomSummary>(rooms.map((room) => [room.id, room])),
    [rooms]
  );

  const selectedRoom = roomLookup.get(selectedRoomId) ?? null;

  const canJoinSelected =
    !!selectedRoom &&
    selectedRoom.participants.current < selectedRoom.participants.capacity &&
    !isSessionPending;
  const isJoiningSelected =
    joiningRoomId !== null && joiningRoomId === selectedRoomId;

  const pageCount = useMemo(() => {
    if (rooms.length === 0) return 0;
    return Math.ceil(rooms.length / ROOMS_PER_PAGE);
  }, [rooms.length]);

  useEffect(() => {
    setPageIndex(0);
  }, [filter, deferredQuery]);

  useEffect(() => {
    if (!selectedRoomId) return;
    void router.prefetch(`/room/${selectedRoomId}`);
  }, [router, selectedRoomId]);

  useEffect(() => {
    const toastKey = searchParams.get("toast");
    if (!toastKey) {
      handledToastKeyRef.current = null;
      return;
    }

    if (handledToastKeyRef.current === toastKey) return;
    handledToastKeyRef.current = toastKey;

    if (toastKey === "disbanded") {
      toast.message("The host disbanded the room.");
    } else if (toastKey === "room_not_found") {
      toast.error("That room no longer exists.");
    } else if (toastKey === "join_required") {
      toast.message("Join the room from Discover before opening it.");
    } else if (toastKey === "password_required") {
      toast.message("This room is private. Enter the password to join.");
    }

    window.history.replaceState(null, "", "/discover");
  }, [searchParams]);

  useEffect(() => {
    if (hasMoreRooms) return;
    if (pageCount === 0) {
      setPageIndex(0);
      return;
    }
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [hasMoreRooms, pageCount]);

  useEffect(() => {
    const requiredCount = (pageIndex + 1) * ROOMS_PER_PAGE;
    if (rooms.length >= requiredCount) return;
    if (!hasMoreRooms || isRoomsFetchingMore) return;
    loadMoreRooms();
  }, [
    rooms.length,
    hasMoreRooms,
    isRoomsFetchingMore,
    loadMoreRooms,
    pageIndex,
  ]);

  const pagedRooms = useMemo(() => {
    const start = pageIndex * ROOMS_PER_PAGE;
    return rooms.slice(start, start + ROOMS_PER_PAGE);
  }, [rooms, pageIndex]);

  const handleReset = useCallback(() => {
    setQuery("");
    setFilter("all");
  }, []);

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
  }, []);

  const handleJoinRoom = useCallback(
    (roomId: string) => {
      if (isSessionPending || joiningRoomId || joinRoom.isJoining) return;
      if (!session) {
        router.push(
          `/signin?callbackURL=${encodeURIComponent(`/room/${roomId}`)}`
        );
        return;
      }

      setJoiningRoomId(roomId);
      setSelectedRoomId(roomId);

      void (async () => {
        const result = await joinRoom.attemptJoin(roomId);
        if (!result.ok) {
          if (result.requiresPassword) {
            const name = roomLookup.get(roomId)?.name ?? "Room";
            setJoiningRoomId(null);
            setJoinModalRoomId(roomId);
            setJoinModalRoomName(name);
            setJoinPassword("");
            setJoinError(null);
            return;
          }

          setJoiningRoomId(null);
          toast.error(result.error);
          return;
        }

        router.push(`/room/${roomId}`);
      })();
    },
    [isSessionPending, joinRoom, joiningRoomId, roomLookup, router, session]
  );

  const handleJoinWithPassword = useCallback(() => {
    if (!joinModalRoomId) return;
    if (isSessionPending) return;
    if (!session) return;

    void (async () => {
      const passwordTrimmed = joinPassword.trim();
      if (passwordTrimmed.length < 8) {
        setJoinError("Password must be at least 8 characters.");
        return;
      }

      setJoiningRoomId(joinModalRoomId);
      const result = await joinRoom.attemptJoin(
        joinModalRoomId,
        passwordTrimmed
      );
      if (!result.ok) {
        setJoiningRoomId(null);
        setJoinError(result.error);
        return;
      }

      closeJoinModal();
      router.push(`/room/${joinModalRoomId}`);
    })();
  }, [
    closeJoinModal,
    isSessionPending,
    joinModalRoomId,
    joinPassword,
    joinRoom,
    router,
    session,
  ]);

  const handleRefresh = useCallback(() => {
    setPageIndex(0);
    refreshRooms();
  }, [refreshRooms]);

  const handleCreateClick = useCallback(() => {
    if (isSessionPending) return;
    if (!session) {
      router.push(`/signin?callbackURL=${encodeURIComponent("/discover")}`);
      return;
    }

    createRoom.openModal();
  }, [createRoom, isSessionPending, router, session]);

  const handleCreateSubmit = useCallback(async () => {
    if (!session || isSessionPending) return;
    const result = await createRoom.submit();
    if (result.ok) router.push(`/room/${result.id}`);
  }, [createRoom, isSessionPending, router, session]);

  const handleJoinSelected = useCallback(() => {
    if (!selectedRoom) return;
    handleJoinRoom(selectedRoom.id);
  }, [handleJoinRoom, selectedRoom]);

  const handleResumeHostedRoom = useCallback(() => {
    if (!resumeHostedRoom) return;
    router.push(`/room/${resumeHostedRoom.id}`);
  }, [resumeHostedRoom, router]);

  const handlePrevPage = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageIndex((current) => {
      if (!hasMoreRooms && current >= pageCount - 1) return current;
      return current + 1;
    });
  }, [hasMoreRooms, pageCount]);

  const pageCountLabel = hasMoreRooms
    ? `${Math.max(pageCount, pageIndex + 1)}+`
    : String(pageCount);

  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <AppHeader containerClassName="relative flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <div className="order-1 w-full sm:max-w-[360px]">
          <label htmlFor="room-search" className="sr-only">
            Search rooms
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="room-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rooms, hosts, or tracks..."
              className="h-12 rounded-full bg-white/75 pr-12 pl-11 shadow-sm backdrop-blur"
            />
            <button
              type="button"
              aria-label="Clear room search"
              className="text-muted-foreground hover:text-text-strong absolute top-1/2 right-4 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-colors"
              onClick={() => setQuery("")}
            >
              <X
                className={`h-4 w-4 transition-opacity ${
                  query ? "opacity-100" : "opacity-45"
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <PrimaryNav className="order-2 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2" />

        <div className="order-3 flex items-center justify-end">
          <AuthButtons />
        </div>
      </AppHeader>

      <main className="tt-container pb-16">
        <section
          aria-label="Room discovery"
          className="rounded-[34px] bg-black/55 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8 lg:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:grid-rows-[auto_1fr] lg:items-start">
            {/* Keep ServerInfoPanel aligned with the room list (not the filters) on large screens */}
            <div className="lg:col-start-1 lg:row-start-2">
              <ServerInfoPanel
                selectedRoom={selectedRoom}
                canJoinSelected={canJoinSelected}
                isJoiningSelected={isJoiningSelected}
                onJoinRoom={handleJoinRoom}
              />
            </div>

            <div className="space-y-5 lg:col-start-2 lg:row-start-1">
              <DiscoverResumeBanner
                resumeHostedRoom={resumeHostedRoom}
                onResumeHostedRoom={handleResumeHostedRoom}
              />

              <DiscoverFilterBar
                filter={filter}
                query={query}
                onFilterChange={setFilter}
              />
            </div>

            <div className="space-y-5 lg:col-start-2 lg:row-start-2">
              <DiscoverRoomList
                rooms={pagedRooms}
                selectedRoomId={selectedRoomId}
                joiningRoomId={joiningRoomId}
                onSelectRoom={handleSelectRoom}
                onJoinRoom={handleJoinRoom}
                onReset={handleReset}
              />

              <DiscoverPagination
                pageIndex={pageIndex}
                pageCount={pageCount}
                pageCountLabel={pageCountLabel}
                hasMoreRooms={hasMoreRooms}
                isRoomsFetchingMore={isRoomsFetchingMore}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
              />

              <DiscoverActionBar
                isSessionPending={isSessionPending}
                canJoinSelected={canJoinSelected}
                isJoiningSelected={isJoiningSelected}
                isRoomsFetching={isRoomsFetching}
                onCreate={handleCreateClick}
                onJoinSelected={handleJoinSelected}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </section>
      </main>

      <CreateRoomModal
        open={createRoom.open}
        name={createRoom.name}
        isPublic={createRoom.isPublic}
        password={createRoom.password}
        error={createRoom.error}
        isCreating={createRoom.isCreating}
        onNameChange={createRoom.setName}
        onIsPublicChange={createRoom.setIsPublic}
        onPasswordChange={createRoom.setPassword}
        onCancel={createRoom.closeModal}
        onSubmit={() => void handleCreateSubmit()}
      />

      <JoinPrivateRoomModal
        open={joinModalRoomId !== null}
        roomName={joinModalRoomName}
        password={joinPassword}
        error={joinError}
        isJoining={joinRoom.isJoining}
        onPasswordChange={handleJoinPasswordChange}
        onCancel={closeJoinModal}
        onSubmit={handleJoinWithPassword}
      />
    </div>
  );
}
