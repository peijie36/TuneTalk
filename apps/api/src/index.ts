import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { db } from "@tunetalk/db";
import * as schema from "@tunetalk/db/schema";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "@/src/lib/auth";
import type { HonoAuthVariables } from "@/src/lib/hono-types";
import {
  addRoomConnection,
  handleRoomMessage,
  removeRoomConnection,
} from "@/src/lib/room-realtime";
import { roomsRoute } from "@/src/routes/rooms";

const app = new Hono<HonoAuthVariables>();
const nodeWebSocket = createNodeWebSocket({ app });

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(
  "/api/*",
  cors({
    origin: webOrigin,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);
app.use(logger());

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/", (c) => c.text("Hello, world!"));

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/me", (c) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!user || !session) {
    return c.json({ user: null, session: null }, 401);
  }

  return c.json({ user, session });
});

app.get(
  "/api/rooms/:roomId/ws",
  nodeWebSocket.upgradeWebSocket((c) => {
    const roomId = c.req.param("roomId");
    const user = c.get("user") as HonoAuthVariables["Variables"]["user"];

    return {
      onOpen: (_event, ws) => {
        if (!user) {
          ws.close(1008, "Unauthorized");
          return;
        }

        void (async () => {
          const roomRow = await db
            .select({
              isPublic: schema.room.isPublic,
              createdByUserId: schema.room.createdByUserId,
            })
            .from(schema.room)
            .where(eq(schema.room.id, roomId))
            .limit(1);

          const room = roomRow.at(0);
          if (!room) {
            ws.close(1008, "Room not found");
            return;
          }

          if (!room.isPublic) {
            const membership = await db
              .select({ roomId: schema.roomMember.roomId })
              .from(schema.roomMember)
              .where(
                and(
                  eq(schema.roomMember.roomId, roomId),
                  eq(schema.roomMember.userId, user.id)
                )
              )
              .limit(1);

            if (membership.length === 0) {
              ws.close(1008, "Forbidden");
              return;
            }
          }

          const name =
            user.name?.trim() || user.email?.trim() || `user_${user.id}`;
          addRoomConnection(roomId, ws, {
            id: user.id,
            name,
            role: room.createdByUserId === user.id ? "host" : "member",
          });
        })();
      },
      onMessage: (event, ws) => {
        handleRoomMessage(roomId, ws, event.data);
      },
      onClose: (_event, ws) => {
        removeRoomConnection(roomId, ws);
      },
      onError: (_event, ws) => {
        removeRoomConnection(roomId, ws);
      },
    };
  })
);

app.route("/api/rooms", roomsRoute);

const port = Number(process.env.PORT ?? 8787);
const server = serve({ fetch: app.fetch, port });
nodeWebSocket.injectWebSocket(server);

console.log(`Hono control plane listening on http://localhost:${port}`);
