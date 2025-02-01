export interface DistributorPlugin {
  name: string;
  initialize(feedId: string, config: Record<string, string>): Promise<void>;
  distribute(feedId: string, content: string): Promise<void>;
  shutdown(): Promise<void>;
}

export interface RssItem {
  title?: string;
  content: string;
  link?: string;
  publishedAt: string;
  guid?: string;
}

export interface DBOperations {
  saveRssItem(feedId: string, item: RssItem): void;
  deleteOldRssItems(feedId: string, maxItems: number): void;
  getRssItems(feedId: string, limit: number): RssItem[];
}
