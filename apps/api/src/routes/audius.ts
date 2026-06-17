import { Hono } from "hono";

import type { HonoAuthVariables } from "@/src/lib/hono-types";
import {
  loadAudiusTrack,
  searchAudiusTracks,
  streamAudiusTrack,
} from "@/src/services/audius";

export const audiusRoute = new Hono<HonoAuthVariables>()
  .get("/search", async (c) => {
    const query = (c.req.query("q") ?? "").trim();
    if (!query) return c.json({ tracks: [] });

    const result = await searchAudiusTracks(query);
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ tracks: result.tracks });
  })
  .get("/tracks/:trackId", async (c) => {
    const trackId = c.req.param("trackId");
    if (!trackId.trim()) {
      return c.json({ error: "Track id is required." }, 400);
    }

    const result = await loadAudiusTrack(trackId);
    if (!result.ok) {
      if (result.status === 404) return c.json({ track: result.track }, 404);
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ track: result.track });
  })
  .get("/tracks/:trackId/stream", async (c) => {
    const trackId = c.req.param("trackId");
    if (!trackId.trim()) {
      return c.json({ error: "Track id is required." }, 400);
    }

    const forwardHeaders = new Headers({
      Accept: c.req.header("accept") ?? "*/*",
    });
    const range = c.req.header("range");
    if (range) {
      forwardHeaders.set("range", range);
    }

    const result = await streamAudiusTrack({
      trackId,
      headers: forwardHeaders,
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }

    return new Response(result.response.body, {
      status: result.response.status,
      headers: result.headers,
    });
  });
