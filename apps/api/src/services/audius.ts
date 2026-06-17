import {
  audiusGet,
  audiusStream,
  coerceAudiusTrack,
  copyAudiusStreamHeaders,
  hasAudiusApiKey,
  type AudiusTrackDto,
} from "@/src/adapters/audius";

export async function searchAudiusTracks(
  query: string
): Promise<
  | { ok: true; tracks: AudiusTrackDto[] }
  | { ok: false; status: 500 | 502; error: string }
> {
  if (!hasAudiusApiKey()) {
    return {
      ok: false,
      status: 500,
      error: "Audius API key is not configured.",
    };
  }

  try {
    const { response, payload } = await audiusGet("/tracks/search", {
      query,
      limit: "15",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: "Failed to search Audius tracks.",
      };
    }

    const data = Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : [];

    return {
      ok: true,
      tracks: data
        .map(coerceAudiusTrack)
        .filter((track): track is AudiusTrackDto => Boolean(track)),
    };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "Audius search is unavailable right now.",
    };
  }
}

export async function loadAudiusTrack(
  trackId: string
): Promise<
  | { ok: true; track: AudiusTrackDto | null }
  | { ok: false; status: 404; track: null }
  | { ok: false; status: 500 | 502; error: string }
> {
  if (!hasAudiusApiKey()) {
    return {
      ok: false,
      status: 500,
      error: "Audius API key is not configured.",
    };
  }

  try {
    const { response, payload } = await audiusGet(
      `/tracks/${encodeURIComponent(trackId)}`
    );

    if (response.status === 404) {
      return { ok: false, status: 404, track: null };
    }

    if (!response.ok) {
      return { ok: false, status: 502, error: "Failed to load Audius track." };
    }

    return {
      ok: true,
      track: coerceAudiusTrack((payload as { data?: unknown })?.data),
    };
  } catch {
    return { ok: false, status: 502, error: "Failed to load Audius track." };
  }
}

export async function streamAudiusTrack(input: {
  trackId: string;
  headers: HeadersInit;
}): Promise<
  | { ok: true; response: Response; headers: Headers }
  | { ok: false; status: 500 | 502; error: string }
> {
  if (!hasAudiusApiKey()) {
    return {
      ok: false,
      status: 500,
      error: "Audius API key is not configured.",
    };
  }

  try {
    const response = await audiusStream(
      `/tracks/${encodeURIComponent(input.trackId)}/stream`,
      input.headers
    );

    if (!response.ok && response.status !== 206) {
      return {
        ok: false,
        status: 502,
        error: "Failed to stream Audius track.",
      };
    }

    if (!response.body) {
      return {
        ok: false,
        status: 502,
        error: "Failed to stream Audius track.",
      };
    }

    return {
      ok: true,
      response,
      headers: copyAudiusStreamHeaders(response),
    };
  } catch {
    return { ok: false, status: 502, error: "Failed to stream Audius track." };
  }
}
