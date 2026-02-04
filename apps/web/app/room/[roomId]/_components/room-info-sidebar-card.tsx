"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Copy, Link2, LogOut, Users } from "lucide-react";

import type { RoomPresenceParticipant } from "@tunetalk/shared/room-realtime";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/string-utils";

import type { RoomWebSocketStatus } from "@/hooks/use-room-realtime";

function getWsStatusLabel(
  wsStatus: RoomWebSocketStatus,
  sessionUserId: string | null
) {
  if (!sessionUserId) return "Sign in to connect";
  if (wsStatus === "connected") return "Connected";
  if (wsStatus === "connecting") return "Connecting...";
  if (wsStatus === "offline") return "Offline";
  if (wsStatus === "disconnected") return "Disconnected";
  return "Not connected";
}

function getWsStatusDotClass(
  wsStatus: RoomWebSocketStatus,
  sessionUserId: string | null
) {
  if (!sessionUserId) return "bg-muted-foreground/50";
  if (wsStatus === "connected") return "bg-emerald-500";
  if (wsStatus === "offline") return "bg-amber-500";
  if (wsStatus === "disconnected") return "bg-rose-500";
  return "bg-sky-500";
}

interface RoomInfoSidebarCardProps {
  roomId: string;
  roomName: string;
  hostName: string;
  visibility: "public" | "private";
  participantCurrent: number | null;
  participantCapacity: number | null;
  isLoadingRoom: boolean;
  sessionUserId: string | null;
  filteredParticipants: RoomPresenceParticipant[];
  wsStatus: RoomWebSocketStatus;
  wsStatusDetail: string | null;
  onLeave: () => void;
  leaveDisabled: boolean;
  isLeaving: boolean;
}

export default function RoomInfoSidebarCard({
  roomId,
  roomName,
  hostName,
  visibility,
  participantCurrent,
  participantCapacity,
  isLoadingRoom,
  sessionUserId,
  filteredParticipants,
  wsStatus,
  wsStatusDetail,
  onLeave,
  leaveDisabled,
  isLeaving,
}: RoomInfoSidebarCardProps) {
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (!roomId || roomId === "unknown") return "";
    return `${window.location.origin}/room/${encodeURIComponent(roomId)}`;
  }, [roomId]);

  const handleCopyInvite = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteFeedback("Invite link copied.");
    } catch {
      setInviteFeedback("Could not copy invite link.");
    }
  }, [inviteLink]);

  useEffect(() => {
    if (!inviteFeedback) return;
    const timeout = window.setTimeout(() => setInviteFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [inviteFeedback]);

  const wsStatusLabel = getWsStatusLabel(wsStatus, sessionUserId);
  const wsStatusDotClass = getWsStatusDotClass(wsStatus, sessionUserId);

  return (
    <Card className="bg-surface/80 border-border/70 flex flex-col rounded-[28px] border shadow-sm backdrop-blur">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-text-strong text-base font-semibold">
            {roomName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {inviteLink ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleCopyInvite()}
                aria-label="Copy invite link"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
            <Badge variant="outline" className="bg-white/60 backdrop-blur">
              {visibility === "private" ? "Private" : "Public"}
            </Badge>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
          <Users className="h-4 w-4" aria-hidden="true" />
          {participantCapacity !== null && participantCurrent !== null
            ? `${participantCurrent}/${participantCapacity} participants`
            : "-"}
        </div>

        <div className="text-muted-foreground text-xs">
          {isLoadingRoom ? "Loading room..." : `Host: ${hostName}`}
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span
            className={cn("h-2 w-2 rounded-full", wsStatusDotClass)}
            aria-hidden="true"
          />
          <span className="font-semibold">{wsStatusLabel}</span>
          {wsStatusDetail ? (
            <span className="text-muted-foreground/80 truncate font-medium">
              {wsStatusDetail}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {inviteFeedback ? (
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {inviteFeedback}
          </div>
        ) : null}

        <div className="border-border/70 min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white/80 shadow-inner">
          <div className="border-border/70 border-b px-4 py-3">
            <div className="text-text-strong text-sm font-semibold">
              Participants
            </div>
            <div className="text-muted-foreground text-xs">
              {sessionUserId
                ? wsStatus === "connected"
                  ? "Online participants in this room"
                  : "Connect to see who's online"
                : "Sign in to see online participants"}
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto px-4 py-3">
            {!sessionUserId ? (
              <div className="text-muted-foreground text-sm">
                Sign in to connect to presence.
              </div>
            ) : wsStatus !== "connected" ? (
              <div className="text-muted-foreground text-sm">
                Realtime presence is disconnected.
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No participants yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredParticipants.map((participant) => {
                  const isYou = participant.id === sessionUserId;
                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/60">
                          <AvatarFallback>
                            {getInitials(participant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-text-strong truncate text-sm font-semibold">
                            {isYou ? "You" : participant.name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {participant.role}
                          </div>
                        </div>
                      </div>

                      {participant.role === "host" ? (
                        <Badge variant="subtle" className="shrink-0">
                          Host
                        </Badge>
                      ) : isYou ? (
                        <Badge variant="subtle" className="shrink-0">
                          You
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Button
          type="button"
          onClick={onLeave}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full border-transparent"
          disabled={leaveDisabled || isLeaving}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {isLeaving ? "Leaving..." : "Leave"}
        </Button>
      </CardContent>
    </Card>
  );
}
