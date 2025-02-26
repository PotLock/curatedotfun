import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  RssItem,
  saveRssItem,
  getRssItems,
  deleteOldRssItems,
} from "../rss/queries";

// These are made available for plugins
export class DBOperations {
  constructor(private db: BetterSQLite3Database) {}

  // RSS Operations
  saveRssItem(feedId: string, item: RssItem): void {
    try {
      saveRssItem(this.db, feedId, item);
    } catch (error: any) {
      throw new Error(`Failed to save RSS item: ${error.message}`);
    }
  }

  getRssItems(feedId: string, limit: number): RssItem[] {
    try {
      return getRssItems(this.db, feedId, limit);
    } catch (error: any) {
      throw new Error(`Failed to get RSS items: ${error.message}`);
    }
  }

  deleteOldRssItems(feedId: string, limit: number): void {
    try {
      deleteOldRssItems(this.db, feedId, limit);
    } catch (error: any) {
      throw new Error(`Failed to delete old RSS items: ${error.message}`);
    }
  }
}
