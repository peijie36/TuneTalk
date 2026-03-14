export interface DatedCursor {
  id: string;
  createdAt: Date;
}

export function encodeDatedCursor(value: DatedCursor) {
  return Buffer.from(
    JSON.stringify({
      id: value.id,
      createdAt: value.createdAt.toISOString(),
    }),
    "utf8"
  ).toString("base64url");
}

export function parseDatedCursor(
  value: string | undefined
): DatedCursor | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  let parsed: unknown;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as { id?: unknown; createdAt?: unknown };
  if (typeof record.id !== "string" || typeof record.createdAt !== "string") {
    return null;
  }

  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  return { id: record.id, createdAt };
}
