import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { twitterCache, twitterCookies } from "./schema";

// Twitter Cookie Management
export async function getTwitterCookies(
  db: NodePgDatabase<any>,
  username: string,
) {
  return db
    .select()
    .from(twitterCookies)
    .where(eq(twitterCookies.username, username))
    .then((rows) => rows[0] || null);
}

export function setTwitterCookies(
  db: NodePgDatabase<any>,
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
        updatedAt: new Date(),
      },
    })
    .execute();
}

export function deleteTwitterCookies(
  db: NodePgDatabase<any>,
  username: string,
) {
  return db
    .delete(twitterCookies)
    .where(eq(twitterCookies.username, username))
    .execute();
}

// Twitter Cache Management
export async function getTwitterCacheValue(
  db: NodePgDatabase<any>,
  key: string,
) {
  return db
    .select()
    .from(twitterCache)
    .where(eq(twitterCache.key, key))
    .then((rows) => rows[0] || null);
}

export function setTwitterCacheValue(
  db: NodePgDatabase<any>,
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
        updatedAt: new Date(),
      },
    })
    .execute();
}

export function deleteTwitterCacheValue(db: NodePgDatabase<any>, key: string) {
  return db.delete(twitterCache).where(eq(twitterCache.key, key)).execute();
}

export function clearTwitterCache(db: NodePgDatabase<any>) {
  return db.delete(twitterCache).execute();
}
