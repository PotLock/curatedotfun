import type { RssItem } from "../../services/rss/queries";
import type { DBOperations } from "../../services/db/operations";

export class RssService {
  constructor(
    private feedId: string,
    private title: string,
    private maxItems: number = 100,
    private path?: string,
    private dbOps?: DBOperations,
  ) {}

  saveItem(item: RssItem): void {
    if (!this.dbOps) return;
    this.dbOps.saveRssItem(this.feedId, item);
    this.dbOps.deleteOldRssItems(this.feedId, this.maxItems);
  }

  getItems(limit?: number): RssItem[] {
    if (!this.dbOps) return [];
    return this.dbOps.getRssItems(this.feedId, limit || this.maxItems);
  }

  getTitle(): string {
    return this.title;
  }

  getPath(): string | undefined {
    return this.path;
  }

  getMaxItems(): number {
    return this.maxItems;
  }
}
