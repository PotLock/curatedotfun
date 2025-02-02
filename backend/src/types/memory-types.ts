export interface MemoryConfig {
  ttl?: number;
}

export interface CuratedContent {
  id: string;
  content: string;
  timestamp: number;
  source: 'twitter' | 'rss' | 'telegram';
  metadata?: Record<string, unknown>;
}

export interface SearchQuery {
  pattern: string;
  page?: number;
  pageSize?: number;
}

export interface MemoryPlugin {
  store: (key: string, content: CuratedContent) => Promise<void>;
  retrieve: (key: string) => Promise<CuratedContent | null>;
  search: (query: SearchQuery) => Promise<CuratedContent[]>;
  prune: (olderThan: Date) => Promise<void>;
}
