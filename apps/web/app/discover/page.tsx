"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ChevronDown, RefreshCcw, Search } from "lucide-react";

import AppHeader from "@/components/layout/app-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/utils/cn";

import RoomRow from "./room-row";
import { mockRooms, mockRoomsByCreatedAt, type Room } from "./rooms-mock";
import ServerInfoPanel from "./server-info-panel";

type RoomFilter = "all" | "public" | "private";

const ROOMS_PER_PAGE = 5;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

const roomSearchIndex = new Map(
  mockRooms.map((room) => [
    room.id,
    normalize(
      [
        room.name,
        room.host.name,
        room.nowPlaying.title,
        room.nowPlaying.artist,
      ].join(" ")
    ),
  ])
);

export default function DiscoverPage() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => mockRoomsByCreatedAt[0]?.id ?? ""
  );

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);

  const rooms = mockRoomsByCreatedAt;

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const canJoinSelected =
    !!selectedRoom &&
    selectedRoom.participants.current < selectedRoom.participants.capacity;

  const filteredRooms = useMemo(() => {
    const q = normalize(deferredQuery);

    const matchesFilter = (room: Room) => {
      if (filter === "public") return room.visibility === "public";
      if (filter === "private") return room.visibility === "private";
      return true;
    };

    const matchesQuery = (room: Room) =>
      !q || (roomSearchIndex.get(room.id) ?? "").includes(q);

    return rooms.filter((room) => matchesFilter(room) && matchesQuery(room));
  }, [deferredQuery, filter, rooms]);

  const pageCount = useMemo(() => {
    if (filteredRooms.length === 0) return 0;
    return Math.ceil(filteredRooms.length / ROOMS_PER_PAGE);
  }, [filteredRooms.length]);

  useEffect(() => {
    setPageIndex(0);
  }, [filter, deferredQuery]);

  useEffect(() => {
    if (pageCount === 0) return;
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const pagedRooms = useMemo(() => {
    const start = pageIndex * ROOMS_PER_PAGE;
    return filteredRooms.slice(start, start + ROOMS_PER_PAGE);
  }, [filteredRooms, pageIndex]);

  const handleRefresh = useCallback(() => {
    setPageIndex(0);
  }, []);

  const handleReset = useCallback(() => {
    setQuery("");
    setFilter("all");
  }, []);

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageIndex((current) => Math.min(pageCount - 1, current + 1));
  }, [pageCount]);

  return (
    <div className="bg-background relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-transparent via-white/20 to-white/60" />

      <AppHeader containerClassName="flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <div className="order-2 w-full sm:order-1 sm:max-w-[360px]">
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

        <nav
          aria-label="Primary"
          className="order-1 flex flex-wrap items-center justify-center gap-3 sm:order-2"
        >
          {[
            { label: "Home", href: "/" },
            { label: "Browse", href: "/browse" },
            { label: "Discover", href: "/discover", active: true },
          ].map((item) => (
            <Button
              key={item.label}
              asChild
              variant={item.active ? "default" : "secondary"}
              size="sm"
              className={cn(
                "h-11 px-7",
                item.active
                  ? "shadow-[0_12px_28px_rgba(160,61,240,0.25)]"
                  : "bg-white/55 backdrop-blur"
              )}
            >
              <Link
                href={item.href}
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="order-3 flex items-center justify-end">
          {isSessionPending ? (
            <Skeleton className="h-12 w-56 rounded-full bg-white/55" />
          ) : session ? (
            <button
              type="button"
              className="border-border/80 text-text-strong focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-3 rounded-full border bg-white/75 px-4 py-2.5 shadow-sm backdrop-blur transition-colors hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Open user menu"
            >
              <Avatar className="h-9 w-9 border border-white/60">
                <AvatarFallback>
                  {getInitials(session.user.name ?? session.user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 flex-col text-left sm:flex">
                <span className="max-w-[10rem] truncate text-sm leading-none font-semibold">
                  {session.user.name ?? session.user.email}
                </span>
                <span className="text-muted-foreground max-w-[10rem] truncate text-xs leading-tight">
                  {session.user.email}
                </span>
              </div>
              <ChevronDown
                className="text-muted-foreground h-4 w-4"
                aria-hidden="true"
              />
            </button>
          ) : (
            <Button
              asChild
              variant="secondary"
              className="bg-white/55 backdrop-blur"
            >
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
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
              />
            </div>

            <div className="space-y-5 lg:col-start-2 lg:row-start-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ["all", "All"],
                      ["public", "Public"],
                      ["private", "Private"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={filter === value ? "default" : "secondary"}
                      className={cn(
                        "h-10 px-5",
                        filter === value ? "" : "bg-white/55 backdrop-blur"
                      )}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {label}
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
                      onJoin={handleSelectRoom}
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
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    className="h-12 px-10"
                    disabled={!canJoinSelected}
                    onClick={() => {
                      if (selectedRoom) setSelectedRoomId(selectedRoom.id);
                    }}
                  >
                    Join
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 px-8"
                    onClick={handleRefresh}
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
    </div>
  );
}
