import { env } from "@/src/lib/env";

const AUDIUS_API_BASE = "https://api.audius.co/v1";

export interface AudiusTrackDto {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  durationSec: number | null;
  isStreamable: boolean;
}

export function hasAudiusApiKey() {
  return Boolean(env.AUDIUS_API_KEY);
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

export function coerceAudiusTrack(value: unknown): AudiusTrackDto | null {
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

export async function audiusGet(
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

export async function audiusStream(pathname: string, headers?: HeadersInit) {
  return fetch(getAudiusUrl(pathname), {
    method: "GET",
    headers,
  });
}

export function copyAudiusStreamHeaders(response: Response) {
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

  return headers;
}
