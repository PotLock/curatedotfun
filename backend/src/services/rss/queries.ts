import { and, eq, sql } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { rssItems } from "./schema";

export interface RssItem {
  title?: string;
  content: string;
  link?: string;
  guid?: string;
  publishedAt: string;
}

export function saveRssItem(db: LibSQLDatabase, feedId: string, item: RssItem) {
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
  db: LibSQLDatabase,
  feedId: string,
  limit: number = 100,
): RssItem[] {
  const results = db
    .select()
    .from(rssItems)
    .where(eq(rssItems.feedId, feedId))
    .orderBy(sql`${rssItems.publishedAt} DESC`)
    .limit(limit)
    .all()
    .then();

  return results.map((item) => ({
    title: item.title || undefined,
    content: item.content,
    link: item.link || undefined,
    guid: item.guid || undefined,
    publishedAt: item.publishedAt,
  }));
}

export function deleteOldRssItems(
  db: LibSQLDatabase,
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
