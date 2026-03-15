import { API_BASE_URL } from "@/lib/constants";

export interface AudiusTrack {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  durationSec: number | null;
  isStreamable: boolean;
}

function coerceTrack(value: unknown): AudiusTrack | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.artistName !== "string" ||
    typeof record.isStreamable !== "boolean"
  ) {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    artistName: record.artistName,
    artworkUrl:
      typeof record.artworkUrl === "string" ? record.artworkUrl : null,
    durationSec:
      typeof record.durationSec === "number" ? record.durationSec : null,
    isStreamable: record.isStreamable,
  };
}

export async function searchAudiusTracks(
  query: string
): Promise<AudiusTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(`${API_BASE_URL}/api/audius/search`);
  url.searchParams.set("q", trimmed);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Failed to search Audius tracks.";
    throw new Error(message);
  }

  const data = Array.isArray((payload as { tracks?: unknown })?.tracks)
    ? (payload as { tracks: unknown[] }).tracks
    : [];

  return data
    .map(coerceTrack)
    .filter((track): track is AudiusTrack => Boolean(track));
}

export function audiusStreamUrl(trackId: string) {
  return `${API_BASE_URL}/api/audius/tracks/${encodeURIComponent(trackId)}/stream`;
}

export async function resolveAudiusTrack(
  trackId: string
): Promise<AudiusTrack | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/audius/tracks/${encodeURIComponent(trackId)}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 404) return null;
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Failed to load Audius track.";
    throw new Error(message);
  }

  return coerceTrack((payload as { track?: unknown })?.track);
}
