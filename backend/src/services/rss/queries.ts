import { and, eq, sql } from "drizzle-orm";
import { rssItems } from "./schema";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export interface RssItem {
  title?: string;
  content: string;
  link?: string;
  guid?: string;
  publishedAt: string;
}

export function saveRssItem(
  db: BetterSQLite3Database,
  feedId: string,
  item: RssItem,
) {
  return db.insert(rssItems).values({
    feedId,
    title: item.title,
    content: item.content,
    link: item.link,
    guid: item.guid,
    publishedAt: item.publishedAt,
  }).run();
}

export function getRssItems(
  db: BetterSQLite3Database,
  feedId: string,
  limit: number = 100,
): RssItem[] {
  const results = db
    .select()
    .from(rssItems)
    .where(eq(rssItems.feedId, feedId))
    .orderBy(sql`${rssItems.publishedAt} DESC`)
    .limit(limit)
    .all();

  return results.map((item) => ({
    title: item.title || undefined,
    content: item.content,
    link: item.link || undefined,
    guid: item.guid || undefined,
    publishedAt: item.publishedAt,
  }));
}

export function deleteOldRssItems(
  db: BetterSQLite3Database,
  feedId: string,
  limit: number = 100,
) {
  // First get the cutoff date from the nth most recent item
  const cutoffItem = db
    .select({ publishedAt: rssItems.publishedAt })
    .from(rssItems)
    .where(eq(rssItems.feedId, feedId))
    .orderBy(sql`${rssItems.publishedAt} DESC`)
    .limit(1)
    .offset(limit - 1)
    .get();

  if (!cutoffItem) return; // Nothing to delete if we have fewer items than the limit

  // Delete items older than the cutoff date
  return db
    .delete(rssItems)
    .where(
      and(
        eq(rssItems.feedId, feedId),
        sql`${rssItems.publishedAt} < ${cutoffItem.publishedAt}`
      )
    )
    .run();
}
