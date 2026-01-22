import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import {
  DEFAULT_ROOM_CAPACITY,
  type RoomSummary,
} from "@tunetalk/shared/rooms";
import argon2 from "argon2";
import { and, eq, ilike } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import type { HonoAuthVariables } from "@/src/lib/hono-types";
import {
  broadcastRoomDisbanded,
  getRoomPresenceCount,
} from "@/src/lib/room-realtime";

const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Room name must be at least 3 characters.")
    .max(60, "Room name must be at most 60 characters."),
  isPublic: z.boolean().default(true),
  password: z.string().trim().min(8).max(128).optional(),
});

const joinRoomSchema = z.object({
  password: z.string().trim().min(8).max(128).optional(),
});

function formatRoomSummary(row: {
  id: string;
  name: string;
  createdAt: Date;
  isPublic: boolean;
  hostName: string | null;
  presenceCount: number;
}): RoomSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    visibility: row.isPublic ? ("public" as const) : ("private" as const),
    host: { name: row.hostName ?? "Unknown" },
    participants: {
      current: row.presenceCount,
      capacity: DEFAULT_ROOM_CAPACITY,
    },
    nowPlaying: { title: "TuneTalk", artist: "Room Radio" },
  };
}

function coerceLimit(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function coerceOffset(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

export const roomsRoute = new Hono<HonoAuthVariables>()
  .get("/", async (c) => {
    const limit = coerceLimit(c.req.query("limit"));
    const offset = coerceOffset(c.req.query("offset"));
    const q = (c.req.query("q") ?? "").trim();

    const rooms = await db.query.room.findMany({
      where: q ? (room) => ilike(room.name, `%${q}%`) : undefined,
      with: {
        createdByUser: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: (room, { desc }) => [desc(room.createdAt)],
      limit,
      offset,
    });

    const result = rooms.map((room) =>
      formatRoomSummary({
        id: room.id,
        name: room.name,
        createdAt: room.createdAt,
        isPublic: room.isPublic,
        hostName: room.createdByUser.name,
        presenceCount: getRoomPresenceCount(room.id),
      })
    );

    return c.json({
      rooms: result,
      limit,
      offset,
      nextOffset: offset + result.length,
    });
  })
  .get("/:roomId", async (c) => {
    const user = c.get("user");
    const roomId = c.req.param("roomId");

    const room = await db.query.room.findFirst({
      where: (room, { eq }) => eq(room.id, roomId),
      with: {
        createdByUser: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (!room) return c.json({ error: "Room not found" }, 404);

    if (!room.isPublic) {
      if (!user) return c.json({ error: "Unauthorized" }, 401);

      const membership = await db.query.roomMember.findFirst({
        where: (member, { and, eq }) =>
          and(eq(member.roomId, roomId), eq(member.userId, user.id)),
        columns: { roomId: true },
      });

      if (!membership) return c.json({ error: "Forbidden" }, 403);
    }

    return c.json(
      formatRoomSummary({
        id: room.id,
        name: room.name,
        createdAt: room.createdAt,
        isPublic: room.isPublic,
        hostName: room.createdByUser.name,
        presenceCount: getRoomPresenceCount(room.id),
      })
    );
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

    const roomId = `room_${crypto.randomUUID()}`;
    const passwordHash =
      body.data.isPublic || !body.data.password
        ? null
        : await argon2.hash(body.data.password, { type: argon2.argon2id });

    await db.insert(schema.room).values({
      id: roomId,
      name: body.data.name,
      isPublic: body.data.isPublic,
      passwordHash,
      createdByUserId: user.id,
    });

    await db
      .insert(schema.roomMember)
      .values({ roomId, userId: user.id, role: "host" })
      .onConflictDoNothing();

    return c.json({ id: roomId }, 201);
  })
  .post("/:roomId/join", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const roomId = c.req.param("roomId");

    const roomRow = await db
      .select({
        id: schema.room.id,
        isPublic: schema.room.isPublic,
        passwordHash: schema.room.passwordHash,
      })
      .from(schema.room)
      .where(eq(schema.room.id, roomId))
      .limit(1);

    const room = roomRow.at(0);
    if (!room) return c.json({ error: "Room not found" }, 404);

    if (!room.isPublic) {
      const jsonBody: unknown = await c.req.json().catch(() => ({}));
      const body = joinRoomSchema.safeParse(jsonBody);
      if (!body.success) {
        return c.json(
          { error: body.error.issues.at(0)?.message ?? "Invalid body" },
          400
        );
      }

      if (!body.data.password) {
        return c.json({ error: "Password is required." }, 400);
      }

      if (!room.passwordHash) {
        return c.json({ error: "Room password is not configured." }, 500);
      }

      const ok = await argon2.verify(room.passwordHash, body.data.password);
      if (!ok) return c.json({ error: "Incorrect password." }, 403);
    }

    await db
      .insert(schema.roomMember)
      .values({ roomId, userId: user.id, role: "member" })
      .onConflictDoNothing();

    return c.json({ joined: true });
  })
  .post("/:roomId/leave", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const roomId = c.req.param("roomId");

    const roomRow = await db
      .select({ createdByUserId: schema.room.createdByUserId })
      .from(schema.room)
      .where(eq(schema.room.id, roomId))
      .limit(1);

    const room = roomRow.at(0);
    if (!room) return c.json({ error: "Room not found" }, 404);

    const isHost = room.createdByUserId === user.id;
    if (isHost) {
      await db.delete(schema.room).where(eq(schema.room.id, roomId));
      broadcastRoomDisbanded(roomId);
      return c.json({ disbanded: true });
    }

    await db
      .delete(schema.roomMember)
      .where(
        and(
          eq(schema.roomMember.roomId, roomId),
          eq(schema.roomMember.userId, user.id)
        )
      );

    return c.json({ left: true });
  });
