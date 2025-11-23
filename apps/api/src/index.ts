import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import type { PlaybackState } from "@tunetalk/shared";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono();
const nodeWebSocket = createNodeWebSocket({ app });

const playbackSchema = z.object({
  trackId: z.string().min(1),
  positionMs: z.number().int().nonnegative().default(0),
  isPaused: z.boolean().default(false),
  updatedAt: z.string().datetime().optional(),
});

type PlaybackPayload = z.infer<typeof playbackSchema>;

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/lobbies/:id/playback", async (c) => {
  const json: unknown = await c.req.json().catch(() => null);
  const parsed = playbackSchema.safeParse(json);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 422);
  }

  const lobbyId = c.req.param("id");
  const payload: PlaybackPayload = parsed.data;

  const state: PlaybackState = {
    lobbyId,
    trackId: payload.trackId,
    positionMs: payload.positionMs,
    isPaused: payload.isPaused,
    updatedAt: payload.updatedAt
      ? new Date(payload.updatedAt).toISOString()
      : new Date().toISOString(),
  };

  // TODO: Persist state in Supabase + broadcast to listeners
  return c.json({ state });
});

app.get(
  "/lobbies/:id/socket",
  nodeWebSocket.upgradeWebSocket((c) => {
    const lobbyId = c.req.param("id");
    return {
      onMessage: (event, ws) => {
        // TODO: Authenticate callers and fan-out events via Supabase or Redis
        console.info(`[lobby:${lobbyId}] message`, event.data);
        ws.send(event.data);
      },
      onClose: () => {
        console.info(`[lobby:${lobbyId}] connection closed`);
      },
    };
  })
);

const port = Number(process.env.PORT ?? 8787);
const server = serve({ fetch: app.fetch, port });
nodeWebSocket.injectWebSocket(server);

console.log(`Hono control plane listening on http://localhost:${port}`);
