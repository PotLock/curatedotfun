import { eq } from "drizzle-orm";
import { twitterCache, twitterCookies } from "./schema";
import { LibSQLDatabase } from "drizzle-orm/libsql";

// Twitter Cookie Management
export function getTwitterCookies(db: LibSQLDatabase, username: string) {
  return db
    .select()
    .from(twitterCookies)
    .where(eq(twitterCookies.username, username))
    .get().then();
}

export function setTwitterCookies(
  db: LibSQLDatabase,
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

export function deleteTwitterCookies(db: LibSQLDatabase, username: string) {
  return db.delete(twitterCookies).where(eq(twitterCookies.username, username));
}

// Twitter Cache Management
export function getTwitterCacheValue(db: LibSQLDatabase, key: string) {
  return db.select().from(twitterCache).where(eq(twitterCache.key, key)).get().then();
}

export function setTwitterCacheValue(
  db: LibSQLDatabase,
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

export function deleteTwitterCacheValue(db: LibSQLDatabase, key: string) {
  return db.delete(twitterCache).where(eq(twitterCache.key, key));
}

export function clearTwitterCache(db: LibSQLDatabase) {
  return db.delete(twitterCache);
}
