import { Hono } from "hono";

import { env } from "@/src/lib/env";
import type { HonoAuthVariables } from "@/src/lib/hono-types";

const AUDIUS_API_BASE = "https://api.audius.co/v1";

interface AudiusTrackDto {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  durationSec: number | null;
  isStreamable: boolean;
}

function getAudiusUrl(pathname: string, searchParams?: Record<string, string>) {
  const url = new URL(`${AUDIUS_API_BASE}${pathname}`);
  url.searchParams.set("app_name", "TuneTalk");

  if (env.AUDIUS_API_KEY) {
    url.searchParams.set("api_key", env.AUDIUS_API_KEY);
  }

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function coerceTrack(value: unknown): AudiusTrackDto | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const user =
    record.user && typeof record.user === "object"
      ? (record.user as Record<string, unknown>)
      : null;
  const artwork =
    record.artwork && typeof record.artwork === "object"
      ? (record.artwork as Record<string, unknown>)
      : null;

  const id =
    typeof record.id === "string" || typeof record.id === "number"
      ? String(record.id)
      : null;
  const title = typeof record.title === "string" ? record.title : null;
  const artistName = typeof user?.name === "string" ? user.name : null;
  const artworkUrl =
    typeof artwork?.["480x480"] === "string"
      ? artwork["480x480"]
      : typeof artwork?.["150x150"] === "string"
        ? artwork["150x150"]
        : null;
  const durationSec =
    typeof record.duration === "number" ? Math.floor(record.duration) : null;
  const isStreamable = record.is_streamable === true;
  const isUnlisted = record.is_unlisted === true;
  const isDeleted = record.is_delete === true;
  const hasStreamConditions =
    typeof record.stream_conditions === "object" &&
    record.stream_conditions !== null;

  if (!id || !title || !artistName) return null;

  return {
    id,
    title,
    artistName,
    artworkUrl,
    durationSec,
    isStreamable:
      isStreamable && !isUnlisted && !isDeleted && !hasStreamConditions,
  };
}

async function audiusGet(
  pathname: string,
  searchParams?: Record<string, string>
) {
  const response = await fetch(getAudiusUrl(pathname, searchParams), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload: unknown = await response.json().catch(() => null);
  return { response, payload };
}

async function audiusStream(pathname: string, headers?: HeadersInit) {
  return fetch(getAudiusUrl(pathname), {
    method: "GET",
    headers,
  });
}

export const audiusRoute = new Hono<HonoAuthVariables>()
  .get("/search", async (c) => {
    const query = (c.req.query("q") ?? "").trim();
    if (!query) return c.json({ tracks: [] });

    if (!env.AUDIUS_API_KEY) {
      return c.json({ error: "Audius API key is not configured." }, 500);
    }

    const { response, payload } = await audiusGet("/tracks/search", {
      query,
      limit: "15",
    });

    if (!response.ok) {
      return c.json({ error: "Failed to search Audius tracks." }, 502);
    }

    const data = Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : [];

    return c.json({
      tracks: data
        .map(coerceTrack)
        .filter((track): track is AudiusTrackDto => Boolean(track)),
    });
  })
  .get("/tracks/:trackId", async (c) => {
    const trackId = c.req.param("trackId");
    if (!trackId.trim()) {
      return c.json({ error: "Track id is required." }, 400);
    }

    if (!env.AUDIUS_API_KEY) {
      return c.json({ error: "Audius API key is not configured." }, 500);
    }

    const { response, payload } = await audiusGet(
      `/tracks/${encodeURIComponent(trackId)}`
    );

    if (response.status === 404) {
      return c.json({ track: null }, 404);
    }

    if (!response.ok) {
      return c.json({ error: "Failed to load Audius track." }, 502);
    }

    const track = coerceTrack((payload as { data?: unknown })?.data);
    return c.json({ track });
  })
  .get("/tracks/:trackId/stream", async (c) => {
    const trackId = c.req.param("trackId");
    if (!trackId.trim()) {
      return c.json({ error: "Track id is required." }, 400);
    }

    if (!env.AUDIUS_API_KEY) {
      return c.json({ error: "Audius API key is not configured." }, 500);
    }

    const forwardHeaders = new Headers({
      Accept: c.req.header("accept") ?? "*/*",
    });
    const range = c.req.header("range");
    if (range) {
      forwardHeaders.set("range", range);
    }

    const response = await audiusStream(
      `/tracks/${encodeURIComponent(trackId)}/stream`,
      forwardHeaders
    );

    if (!response.ok && response.status !== 206) {
      return c.json({ error: "Failed to stream Audius track." }, 502);
    }

    const headers = new Headers();
    for (const name of [
      "accept-ranges",
      "cache-control",
      "content-length",
      "content-range",
      "content-type",
      "etag",
      "last-modified",
    ]) {
      const value = response.headers.get(name);
      if (value) {
        headers.set(name, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  });
