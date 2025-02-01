import { and, eq, sql } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { rssItems } from "./schema";

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
  });
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
  // Keep only the most recent items up to the limit
  const keepIds = db
    .select({ id: rssItems.id })
    .from(rssItems)
    .where(eq(rssItems.feedId, feedId))
    .orderBy(sql`${rssItems.publishedAt} DESC`)
    .limit(limit);

  return db
    .delete(rssItems)
    .where(
      and(eq(rssItems.feedId, feedId), sql`${rssItems.id} NOT IN (${keepIds})`),
    );
}
