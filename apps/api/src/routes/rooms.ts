import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import {
  DEFAULT_ROOM_CAPACITY,
  type RoomSummary,
  type RoomVisibility,
} from "@tunetalk/shared/rooms";
import argon2 from "argon2";
import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
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

interface RoomListCursor {
  id: string;
  createdAt: Date;
}

function encodeRoomListCursor(value: { id: string; createdAt: Date }) {
  return Buffer.from(
    JSON.stringify({
      id: value.id,
      createdAt: value.createdAt.toISOString(),
    }),
    "utf8"
  ).toString("base64url");
}

function parseRoomListCursor(value: string | undefined): RoomListCursor | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  let parsed: unknown;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as { id?: unknown; createdAt?: unknown };
  if (typeof record.id !== "string" || typeof record.createdAt !== "string") {
    return null;
  }

  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  return { id: record.id, createdAt };
}

function parseRoomVisibility(value: string | undefined): RoomVisibility | null {
  if (value === "public" || value === "private") return value;
  return null;
}

interface RoomMessageCursor {
  id: string;
  createdAt: Date;
}

function encodeRoomMessageCursor(value: { id: string; createdAt: Date }) {
  return Buffer.from(
    JSON.stringify({
      id: value.id,
      createdAt: value.createdAt.toISOString(),
    }),
    "utf8"
  ).toString("base64url");
}

function parseRoomMessageCursor(
  value: string | undefined
): RoomMessageCursor | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  let parsed: unknown;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as { id?: unknown; createdAt?: unknown };
  if (typeof record.id !== "string" || typeof record.createdAt !== "string") {
    return null;
  }

  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  return { id: record.id, createdAt };
}

export const roomsRoute = new Hono<HonoAuthVariables>()
  .get("/", async (c) => {
    const limit = coerceLimit(c.req.query("limit"));
    const q = (c.req.query("q") ?? "").trim();
    const visibilityRaw = (c.req.query("visibility") ?? "").trim();
    const visibility = parseRoomVisibility(visibilityRaw || undefined);
    if (visibilityRaw && !visibility) {
      return c.json({ error: "Invalid visibility filter." }, 400);
    }
    const cursorRaw = c.req.query("cursor");
    const cursor = parseRoomListCursor(cursorRaw);
    if ((cursorRaw ?? "").trim() && !cursor) {
      return c.json({ error: "Invalid cursor." }, 400);
    }

    const filters = [
      q ? ilike(schema.room.name, `%${q}%`) : null,
      visibility ? eq(schema.room.isPublic, visibility === "public") : null,
      cursor
        ? or(
            lt(schema.room.createdAt, cursor.createdAt),
            and(
              eq(schema.room.createdAt, cursor.createdAt),
              lt(schema.room.id, cursor.id)
            )
          )
        : null,
    ].filter((condition): condition is NonNullable<typeof condition> =>
      Boolean(condition)
    );

    const rows = await db
      .select({
        id: schema.room.id,
        name: schema.room.name,
        createdAt: schema.room.createdAt,
        isPublic: schema.room.isPublic,
        hostName: schema.user.name,
      })
      .from(schema.room)
      .leftJoin(schema.user, eq(schema.user.id, schema.room.createdByUserId))
      .where(
        filters.length === 0
          ? undefined
          : filters.length === 1
            ? filters[0]
            : and(...filters)
      )
      .orderBy(desc(schema.room.createdAt), desc(schema.room.id))
      .limit(limit);

    const result = rows.map((row) =>
      formatRoomSummary({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt,
        isPublic: row.isPublic,
        hostName: row.hostName,
        presenceCount: getRoomPresenceCount(row.id),
      })
    );

    const nextCursor =
      rows.length === limit
        ? encodeRoomListCursor({
            id: rows.at(-1)!.id,
            createdAt: rows.at(-1)!.createdAt,
          })
        : null;

    return c.json({
      rooms: result,
      limit,
      nextCursor,
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
  .get("/:roomId/messages", async (c) => {
    const user = c.get("user");
    const roomId = c.req.param("roomId");

    const limitRaw = c.req.query("limit");
    const limitParsed = Number(limitRaw);
    const limit = Number.isFinite(limitParsed)
      ? Math.min(100, Math.max(1, Math.trunc(limitParsed)))
      : 50;

    const cursorRaw = c.req.query("cursor");
    const cursor = parseRoomMessageCursor(cursorRaw);
    if ((cursorRaw ?? "").trim() && !cursor) {
      return c.json({ error: "Invalid cursor." }, 400);
    }

    const room = await db.query.room.findFirst({
      where: (room, { eq }) => eq(room.id, roomId),
      columns: {
        id: true,
        isPublic: true,
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
        ? encodeRoomMessageCursor({
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
    const jsonBody: unknown = await c.req.json().catch(() => ({}));
    const body = joinRoomSchema.safeParse(jsonBody);
    if (!body.success) {
      return c.json(
        { error: body.error.issues.at(0)?.message ?? "Invalid body" },
        400
      );
    }

    const result = await db.transaction<
      | { ok: true }
      | { ok: false; error: string; status: 400 | 403 | 404 | 409 | 500 }
    >(async (tx) => {
      // Serialize joins per room to keep capacity checks race-safe.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${roomId}))`);

      const roomRow = await tx
        .select({
          id: schema.room.id,
          isPublic: schema.room.isPublic,
          passwordHash: schema.room.passwordHash,
        })
        .from(schema.room)
        .where(eq(schema.room.id, roomId))
        .limit(1);

      const room = roomRow.at(0);
      if (!room)
        return { ok: false as const, error: "Room not found", status: 404 };

      if (!room.isPublic) {
        if (!body.data.password) {
          return {
            ok: false as const,
            error: "Password is required.",
            status: 400,
          };
        }

        if (!room.passwordHash) {
          return {
            ok: false as const,
            error: "Room password is not configured.",
            status: 500,
          };
        }

        const passwordValid = await argon2.verify(
          room.passwordHash,
          body.data.password
        );
        if (!passwordValid) {
          return {
            ok: false as const,
            error: "Incorrect password.",
            status: 403,
          };
        }
      }

      const existingMembership = await tx
        .select({ roomId: schema.roomMember.roomId })
        .from(schema.roomMember)
        .where(
          and(
            eq(schema.roomMember.roomId, roomId),
            eq(schema.roomMember.userId, user.id)
          )
        )
        .limit(1);

      if (existingMembership.length > 0) return { ok: true as const };

      const countRow = await tx
        .select({ count: sql<number>`count(*)` })
        .from(schema.roomMember)
        .where(eq(schema.roomMember.roomId, roomId))
        .limit(1);

      const memberCount = Number(countRow.at(0)?.count ?? 0);
      if (memberCount >= DEFAULT_ROOM_CAPACITY) {
        return { ok: false as const, error: "Room is full.", status: 409 };
      }

      await tx.insert(schema.roomMember).values({
        roomId,
        userId: user.id,
        role: "member",
      });

      return { ok: true as const };
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
