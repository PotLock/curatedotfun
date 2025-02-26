import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { twitterCache, twitterCookies } from "./schema";

// Twitter Cookie Management
export async function getTwitterCookies(
  db: BetterSQLite3Database,
  username: string,
): Promise<any> {
  return await db.transaction(async (tx) => {
    tx.select()
      .from(twitterCookies)
      .where(eq(twitterCookies.username, username))
      .get();
  });
}

export function setTwitterCookies(
  db: BetterSQLite3Database,
  username: string,
  cookiesJson: string,
) {
  return db
    .insert(twitterCookies)
    .values({
      username,
      cookies: cookiesJson,
    })
    .onConflictDoUpdate({
      target: twitterCookies.username,
      set: {
        cookies: cookiesJson,
        updatedAt: new Date().toISOString(),
      },
    });
}

export function deleteTwitterCookies(
  db: BetterSQLite3Database,
  username: string,
) {
  return db.delete(twitterCookies).where(eq(twitterCookies.username, username));
}

// Twitter Cache Management
export async function getTwitterCacheValue(
  db: BetterSQLite3Database,
  key: string,
): Promise<any> {
  return await db.transaction(async (tx) => {
    tx.select().from(twitterCache).where(eq(twitterCache.key, key)).get();
  });
}

export function setTwitterCacheValue(
  db: BetterSQLite3Database,
  key: string,
  value: string,
) {
  return db
    .insert(twitterCache)
    .values({
      key,
      value,
    })
    .onConflictDoUpdate({
      target: twitterCache.key,
      set: {
        value,
        updatedAt: new Date().toISOString(),
      },
    });
}

export function deleteTwitterCacheValue(
  db: BetterSQLite3Database,
  key: string,
) {
  return db.delete(twitterCache).where(eq(twitterCache.key, key));
}

export function clearTwitterCache(db: BetterSQLite3Database) {
  return db.delete(twitterCache);
}
