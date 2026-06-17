import { db } from "@tunetalk/db";
import { sql } from "drizzle-orm";

export async function checkDatabaseReady() {
  await db.execute(sql`select 1`);
}
