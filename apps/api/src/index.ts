import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";

const app = new Hono();
const nodeWebSocket = createNodeWebSocket({ app });

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 8787);
const server = serve({ fetch: app.fetch, port });
nodeWebSocket.injectWebSocket(server);

console.log(`Hono control plane listening on http://localhost:${port}`);
