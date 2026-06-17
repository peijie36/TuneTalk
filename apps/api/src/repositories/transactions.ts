import { db } from "@tunetalk/db";
import { sql, type SQL } from "drizzle-orm";

interface TransactionClient {
  execute(query: SQL): Promise<unknown>;
}

export function runTransaction<T>(
  callback: Parameters<typeof db.transaction<T>>[0]
) {
  return db.transaction(callback);
}

export async function lockRoomTransaction(
  tx: TransactionClient,
  roomId: string
) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${roomId}))`);
}
