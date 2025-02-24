import { eq } from "drizzle-orm";
import { twitterCache, twitterCookies } from "./schema";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

// Twitter Cookie Management
export function getTwitterCookies(db: BunSQLiteDatabase, username: string) {
  return db
    .select()
    .from(twitterCookies)
    .where(eq(twitterCookies.username, username))
    .get();
}

export function setTwitterCookies(
  db: BunSQLiteDatabase,
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

export function deleteTwitterCookies(db: BunSQLiteDatabase, username: string) {
  return db.delete(twitterCookies).where(eq(twitterCookies.username, username));
}

// Twitter Cache Management
export function getTwitterCacheValue(db: BunSQLiteDatabase, key: string) {
  return db.select().from(twitterCache).where(eq(twitterCache.key, key)).get();
}

export function setTwitterCacheValue(
  db: BunSQLiteDatabase,
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

export function deleteTwitterCacheValue(db: BunSQLiteDatabase, key: string) {
  return db.delete(twitterCache).where(eq(twitterCache.key, key));
}

export function clearTwitterCache(db: BunSQLiteDatabase) {
  return db.delete(twitterCache);
}
