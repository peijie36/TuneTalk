import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { Hono } from "hono";

import type { HonoAuthVariables } from "@/src/lib/hono-types";
import { addRoomQueueItem, listRoomQueueItems } from "@/src/lib/room-queue";
import {
  broadcastPlaybackState,
  broadcastQueueItemAdded,
  broadcastQueueItemsRemoved,
  broadcastRoomDisbanded,
} from "@/src/lib/room-realtime";
import {
  encodeDatedCursor,
  parseDatedCursor,
} from "@/src/routes/helpers/dated-cursor";
import {
  coerceLimit,
  createEmptyPlaybackState,
  formatPlaybackState,
  formatRoomSummary,
  parseRoomVisibility,
} from "@/src/routes/helpers/rooms";
import {
  addQueueItemSchema,
  createRoomSchema,
  joinRoomSchema,
  updatePlaybackSchema,
} from "@/src/routes/schemas/rooms.schema";
import { getRoomAccessContext } from "@/src/services/rooms/access";
import {
  createRoomForUser,
  joinRoomForUser,
  leaveRoomForUser,
} from "@/src/services/rooms/lifecycle";
import {
  getRoomPlaybackRecord,
  saveRoomPlaybackUpdate,
} from "@/src/services/rooms/playback";
import {
  getRoomSummaryRecord,
  listRoomSummaries,
} from "@/src/services/rooms/summary";

export const roomsRoute = new Hono<HonoAuthVariables>()
  .get("/", async (c) => {
    const visibilityRaw = (c.req.query("visibility") ?? "").trim();
    const visibility = parseRoomVisibility(visibilityRaw || undefined);
    if (visibilityRaw && !visibility) {
      return c.json({ error: "Invalid visibility filter." }, 400);
    }

    const cursorRaw = c.req.query("cursor");
    const cursor = parseDatedCursor(cursorRaw);
    if ((cursorRaw ?? "").trim() && !cursor) {
      return c.json({ error: "Invalid cursor." }, 400);
    }

    const result = await listRoomSummaries({
      limit: coerceLimit(c.req.query("limit")),
      q: (c.req.query("q") ?? "").trim(),
      visibility,
      cursor,
    });

    return c.json({
      rooms: result.rooms,
      limit: coerceLimit(c.req.query("limit")),
      nextCursor: result.nextCursor,
    });
  })
  .get("/:roomId", async (c) => {
    const user = c.get("user");
    const roomId = c.req.param("roomId");

    const access = await getRoomAccessContext(roomId, user?.id ?? null);
    if (!access.ok) return c.json({ error: access.error }, access.status);

    const room = await getRoomSummaryRecord(roomId);
    if (!room) return c.json({ error: "Room not found" }, 404);

    return c.json(formatRoomSummary(room));
  })
  .get("/:roomId/messages", async (c) => {
    const user = c.get("user");
    const roomId = c.req.param("roomId");

    const limitRaw = c.req.query("limit");
    const limitParsed = Number(limitRaw);
    const limit = Number.isFinite(limitParsed)
      ? Math.min(100, Math.max(1, Math.trunc(limitParsed)))
      : 50;

    const cursorRaw = c.req.query("cursor");
    const cursor = parseDatedCursor(cursorRaw);
    if ((cursorRaw ?? "").trim() && !cursor) {
      return c.json({ error: "Invalid cursor." }, 400);
    }

    const access = await getRoomAccessContext(roomId, user?.id ?? null);
    if (!access.ok) return c.json({ error: access.error }, access.status);

    const rows = await db
      .select({
        id: schema.roomMessage.id,
        text: schema.roomMessage.text,
        createdAt: schema.roomMessage.createdAt,
        userId: schema.roomMessage.userId,
        userName: schema.user.name,
      })
      .from(schema.roomMessage)
      .leftJoin(schema.user, eq(schema.user.id, schema.roomMessage.userId))
      .where(
        cursor
          ? and(
              eq(schema.roomMessage.roomId, roomId),
              or(
                lt(schema.roomMessage.createdAt, cursor.createdAt),
                and(
                  eq(schema.roomMessage.createdAt, cursor.createdAt),
                  lt(schema.roomMessage.id, cursor.id)
                )
              )
            )
          : eq(schema.roomMessage.roomId, roomId)
      )
      .orderBy(desc(schema.roomMessage.createdAt), desc(schema.roomMessage.id))
      .limit(limit);

    const messages = rows
      .map((row) => ({
        id: row.id,
        sender: {
          id: row.userId,
          name: row.userName ?? "Unknown",
        },
        text: row.text,
        createdAt: row.createdAt.toISOString(),
      }))
      .reverse();

    const nextCursor =
      rows.length === limit
        ? encodeDatedCursor({
            id: rows.at(-1)!.id,
            createdAt: rows.at(-1)!.createdAt,
          })
        : null;

    return c.json({ messages, nextCursor });
  })
  .post("/", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const jsonBody: unknown = await c.req.json().catch(() => ({}));
    const body = createRoomSchema.safeParse(jsonBody);
    if (!body.success) {
      return c.json(
        { error: body.error.issues.at(0)?.message ?? "Invalid body" },
        400
      );
    }

    if (!body.data.isPublic && !body.data.password) {
      return c.json({ error: "Password is required for private rooms." }, 400);
    }

    const result = await createRoomForUser({
      userId: user.id,
      name: body.data.name,
      isPublic: body.data.isPublic,
      password: body.data.password,
    });

    return c.json(result, 201);
  })
  .post("/:roomId/join", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const jsonBody: unknown = await c.req.json().catch(() => ({}));
    const body = joinRoomSchema.safeParse(jsonBody);
    if (!body.success) {
      return c.json(
        { error: body.error.issues.at(0)?.message ?? "Invalid body" },
        400
      );
    }

    const result = await joinRoomForUser({
      roomId: c.req.param("roomId"),
      userId: user.id,
      password: body.data.password,
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ joined: true });
  })
  .post("/:roomId/leave", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const roomId = c.req.param("roomId");
    const result = await leaveRoomForUser({ roomId, userId: user.id });
    if (!result) return c.json({ error: "Room not found" }, 404);

    if ("disbanded" in result) {
      broadcastRoomDisbanded(roomId);
      return c.json(result);
    }

    return c.json(result);
  })
  .get("/:roomId/queue", async (c) => {
    const user = c.get("user");
    const roomId = c.req.param("roomId");

    const access = await getRoomAccessContext(roomId, user?.id ?? null);
    if (!access.ok) return c.json({ error: access.error }, access.status);

    const queue = await listRoomQueueItems(roomId);
    return c.json({ queue });
  })
  .post("/:roomId/queue", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const roomId = c.req.param("roomId");
    const access = await getRoomAccessContext(roomId, user.id);
    if (!access.ok) return c.json({ error: access.error }, access.status);
    if (!access.role) {
      return c.json({ error: "Join room before queueing." }, 403);
    }

    const jsonBody: unknown = await c.req.json().catch(() => ({}));
    const body = addQueueItemSchema.safeParse(jsonBody);
    if (!body.success) {
      return c.json(
        { error: body.error.issues.at(0)?.message ?? "Invalid body" },
        400
      );
    }

    const item = await addRoomQueueItem({
      roomId,
      userId: user.id,
      provider: body.data.provider,
      providerTrackId: body.data.providerTrackId,
      title: body.data.title,
      artistName: body.data.artistName,
      artworkUrl: body.data.artworkUrl,
      durationSec: body.data.durationSec,
    });

    broadcastQueueItemAdded(roomId, item);
    return c.json({ item }, 201);
  })
  .get("/:roomId/playback", async (c) => {
    const user = c.get("user");
    const roomId = c.req.param("roomId");

    const access = await getRoomAccessContext(roomId, user?.id ?? null);
    if (!access.ok) return c.json({ error: access.error }, access.status);

    const playback = await getRoomPlaybackRecord(roomId);
    return c.json({
      playback: playback
        ? formatPlaybackState(playback)
        : createEmptyPlaybackState(roomId),
    });
  })
  .post("/:roomId/playback", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const roomId = c.req.param("roomId");
    const access = await getRoomAccessContext(roomId, user.id);
    if (!access.ok) return c.json({ error: access.error }, access.status);
    if (!access.isHost) {
      return c.json({ error: "Only host can control playback." }, 403);
    }

    const jsonBody: unknown = await c.req.json().catch(() => ({}));
    const body = updatePlaybackSchema.safeParse(jsonBody);
    if (!body.success) {
      return c.json(
        { error: body.error.issues.at(0)?.message ?? "Invalid body" },
        400
      );
    }

    const saved = await saveRoomPlaybackUpdate({
      roomId,
      userId: user.id,
      playback: body.data,
    });

    if (!saved) {
      return c.json({ error: "Queue item not found." }, 400);
    }

    if (saved.removedQueueItemIds.length > 0) {
      broadcastQueueItemsRemoved(roomId, saved.removedQueueItemIds);
    }

    const playback = formatPlaybackState(saved.playbackRow);
    broadcastPlaybackState(roomId, playback);
    return c.json({ playback });
  });
