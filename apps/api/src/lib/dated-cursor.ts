export interface DatedCursor {
  id: string;
  createdAt: Date;
}

export function encodeDatedCursor(cursor: DatedCursor) {
  return Buffer.from(
    JSON.stringify({
      id: cursor.id,
      createdAt: cursor.createdAt.toISOString(),
    })
  ).toString("base64url");
}

export function parseDatedCursor(
  value: string | undefined
): DatedCursor | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as {
      id?: unknown;
      createdAt?: unknown;
    };

    if (typeof parsed.id !== "string") return null;
    if (typeof parsed.createdAt !== "string") return null;

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;

    return { id: parsed.id, createdAt };
  } catch {
    return null;
  }
}
