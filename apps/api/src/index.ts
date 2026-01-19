import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
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

    return {
      onOpen: (_event, ws) => {
        addRoomConnection(roomId, ws);
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
