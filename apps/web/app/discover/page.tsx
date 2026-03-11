"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";

import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/hooks/use-create-room";
import { useFetchRoomList } from "@/hooks/use-fetch-room-list";
import { useJoinRoom } from "@/hooks/use-join-room";
import { authClient } from "@/lib/auth-client";
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

export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);

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

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const canJoinSelected =
    !!selectedRoom &&
    selectedRoom.participants.current < selectedRoom.participants.capacity &&
    !isSessionPending;

  const pageCount = useMemo(() => {
    if (rooms.length === 0) return 0;
    return Math.ceil(rooms.length / ROOMS_PER_PAGE);
  }, [rooms.length]);

  useEffect(() => {
    setPageIndex(0);
  }, [filter, deferredQuery]);

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

  const handleReset = () => {
    setQuery("");
    setFilter("all");
  };

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
  }, []);

  const handleJoinRoom = useCallback(
    (roomId: string) => {
      if (isSessionPending) return;
      if (!session) {
        router.push(
          `/signin?callbackURL=${encodeURIComponent(`/room/${roomId}`)}`
        );
        return;
      }

      setSelectedRoomId(roomId);

      void (async () => {
        const result = await joinRoom.attemptJoin(roomId);
        if (!result.ok) {
          if (result.requiresPassword) {
            const name =
              rooms.find((room) => room.id === roomId)?.name ?? "Room";
            setJoinModalRoomId(roomId);
            setJoinModalRoomName(name);
            setJoinPassword("");
            setJoinError(null);
            return;
          }

          toast.error(result.error);
          return;
        }

        router.push(`/room/${roomId}`);
      })();
    },
    [isSessionPending, joinRoom, rooms, router, session]
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

      const result = await joinRoom.attemptJoin(
        joinModalRoomId,
        passwordTrimmed
      );
      if (!result.ok) {
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

  const handleRefresh = () => {
    setPageIndex(0);
    refreshRooms();
  };

  const handleCreateClick = () => {
    if (isSessionPending) return;
    if (!session) {
      router.push(`/signin?callbackURL=${encodeURIComponent("/discover")}`);
      return;
    }

    createRoom.openModal();
  };

  const handleCreateSubmit = async () => {
    if (!session || isSessionPending) return;
    const result = await createRoom.submit();
    if (result.ok) router.push(`/room/${result.id}`);
  };

  const handleJoinSelected = () => {
    if (!selectedRoom) return;
    handleJoinRoom(selectedRoom.id);
  };

  const handlePrevPage = () => {
    setPageIndex((current) => Math.max(0, current - 1));
  };

  const handleNextPage = () => {
    setPageIndex((current) => {
      if (!hasMoreRooms && current >= pageCount - 1) return current;
      return current + 1;
    });
  };

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
              className="h-12 rounded-full bg-white/75 pr-4 pl-11 shadow-sm backdrop-blur"
            />
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
                onJoinRoom={handleJoinRoom}
              />
            </div>

            <div className="space-y-5 lg:col-start-2 lg:row-start-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {FILTER_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={
                        filter === option.value ? "default" : "secondary"
                      }
                      className={cn(
                        "h-10 px-5",
                        filter === option.value
                          ? ""
                          : "bg-white/55 backdrop-blur"
                      )}
                      aria-pressed={filter === option.value}
                      onClick={() => setFilter(option.value)}
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
            </div>

            <div className="space-y-5 lg:col-start-2 lg:row-start-2">
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
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleReset}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  pagedRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      isSelected={room.id === selectedRoomId}
                      onSelect={handleSelectRoom}
                      onJoin={handleJoinRoom}
                    />
                  ))
                )}
              </div>

              {pageCount > 1 || hasMoreRooms ? (
                <nav
                  aria-label="Room pages"
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-muted-foreground text-sm">
                    Page{" "}
                    <span className="text-text-strong font-semibold">
                      {pageIndex + 1}
                    </span>{" "}
                    of{" "}
                    <span className="text-text-strong font-semibold">
                      {pageCountLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePrevPage}
                      disabled={pageIndex === 0}
                      className="h-10 px-5"
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleNextPage}
                      disabled={
                        (!hasMoreRooms && pageIndex >= pageCount - 1) ||
                        isRoomsFetchingMore
                      }
                      className="h-10 px-5"
                    >
                      {isRoomsFetchingMore ? "Loading..." : "Next"}
                    </Button>
                  </div>
                </nav>
              ) : null}

              <div className="border-border/60 border-t pt-6">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 px-8"
                    onClick={handleCreateClick}
                    disabled={isSessionPending}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    className="h-12 px-10"
                    disabled={!canJoinSelected}
                    onClick={handleJoinSelected}
                  >
                    Join
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 px-8"
                    onClick={handleRefresh}
                    disabled={isRoomsFetching}
                  >
                    <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                    Refresh
                  </Button>
                </div>
              </div>
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
