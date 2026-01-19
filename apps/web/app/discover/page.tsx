"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { RefreshCcw, Search } from "lucide-react";

import type { RoomSummary } from "@tunetalk/shared";

import AuthButtons from "@/components/auth/auth-buttons";
import AppHeader from "@/components/layout/app-header";
import PrimaryNav from "@/components/layout/primary-nav";
import CreateRoomModal from "@/components/rooms/create-room-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/hooks/use-create-room";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/utils/cn";
import { normalizeText } from "@/utils/string-utils";

import RoomRow from "./room-row";
import ServerInfoPanel from "./server-info-panel";
import { useRooms } from "./use-rooms";

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

  const {
    rooms,
    isFetching: isRoomsFetching,
    refresh: refreshRooms,
  } = useRooms();

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const createRoom = useCreateRoom();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const roomSearchIndex = useMemo(() => {
    return new Map(
      rooms.map((room) => [
        room.id,
        normalizeText(
          [
            room.name,
            room.host.name,
            room.nowPlaying.title,
            room.nowPlaying.artist,
          ].join(" ")
        ),
      ])
    );
  }, [rooms]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const canJoinSelected =
    !!selectedRoom &&
    selectedRoom.participants.current < selectedRoom.participants.capacity &&
    !isSessionPending;

  const filteredRooms = useMemo(() => {
    const q = normalizeText(deferredQuery);

    if (!q && filter === "all") return rooms;

    const matchesFilter = (room: RoomSummary) => {
      if (filter === "public") return room.visibility === "public";
      if (filter === "private") return room.visibility === "private";
      return true;
    };

    const matchesQuery = (room: RoomSummary) =>
      !q || (roomSearchIndex.get(room.id) ?? "").includes(q);

    return rooms.filter((room) => matchesFilter(room) && matchesQuery(room));
  }, [deferredQuery, filter, roomSearchIndex, rooms]);

  const pageCount = useMemo(() => {
    if (filteredRooms.length === 0) return 0;
    return Math.ceil(filteredRooms.length / ROOMS_PER_PAGE);
  }, [filteredRooms.length]);

  useEffect(() => {
    setPageIndex(0);
  }, [filter, deferredQuery]);

  useEffect(() => {
    const toast = searchParams.get("toast");
    if (!toast) return;

    if (toast === "disbanded") {
      setToastMessage("The host disbanded the room.");
    } else if (toast === "room_not_found") {
      setToastMessage("That room no longer exists.");
    }

    window.history.replaceState(null, "", "/discover");
  }, [router, searchParams]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (pageCount === 0) return;
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const pagedRooms = useMemo(() => {
    const start = pageIndex * ROOMS_PER_PAGE;
    return filteredRooms.slice(start, start + ROOMS_PER_PAGE);
  }, [filteredRooms, pageIndex]);

  const handleReset = useCallback(() => {
    setQuery("");
    setFilter("all");
  }, []);

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
      router.push(`/room/${roomId}`);
    },
    [isSessionPending, router, session]
  );

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

  const handlePrevPage = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageIndex((current) => Math.min(pageCount - 1, current + 1));
  }, [pageCount]);

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
                {filteredRooms.length === 0 ? (
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

              {pageCount > 1 ? (
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
                      {pageCount}
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
                      disabled={pageIndex >= pageCount - 1}
                      className="h-10 px-5"
                    >
                      Next
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

      {toastMessage ? (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm px-4 sm:px-0">
          <div
            role="status"
            className="border-border/70 rounded-2xl border bg-white/85 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-text-strong text-sm font-medium">
                {toastMessage}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setToastMessage(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
