import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "@/src/lib/auth";
import { env } from "@/src/lib/env";
import type { HonoAuthVariables } from "@/src/lib/hono-types";
import { checkDatabaseReady } from "@/src/repositories/health";
import { audiusRoute } from "@/src/routes/audius";
import { registerRoomWebSocketRoute } from "@/src/routes/room-ws";
import { roomsRoute } from "@/src/routes/rooms";

const app = new Hono<HonoAuthVariables>();
const nodeWebSocket = createNodeWebSocket({ app });

const webOrigin = env.WEB_ORIGIN;

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
app.get("/ready", async (c) => {
  try {
    await checkDatabaseReady();
    return c.json({ status: "ready" });
  } catch {
    return c.json({ status: "not_ready" }, 503);
  }
});

app.get("/api/me", (c) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!user || !session) {
    return c.json({ user: null, session: null }, 401);
  }

  return c.json({ user, session });
});

registerRoomWebSocketRoute(app, nodeWebSocket);
app.route("/api/rooms", roomsRoute);
app.route("/api/audius", audiusRoute);

const port = env.PORT;
const server = serve({ fetch: app.fetch, port });
nodeWebSocket.injectWebSocket(server);

console.log(`Hono control plane listening on http://localhost:${port}`);
