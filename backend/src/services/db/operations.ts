import { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  RssItem,
  saveRssItem,
  getRssItems,
  deleteOldRssItems,
} from "../rss/queries";

// These are made available for plugins
export class DBOperations {
  constructor(private db: LibSQLDatabase) {}

  // RSS Operations
  saveRssItem(feedId: string, item: RssItem): void {
    saveRssItem(this.db, feedId, item);
  }

  async getRssItems(feedId: string, limit: number): Promise<RssItem[]> {
    return await getRssItems(this.db, feedId, limit);
  }

  deleteOldRssItems(feedId: string, limit: number): void {
    deleteOldRssItems(this.db, feedId, limit);
  }
}
