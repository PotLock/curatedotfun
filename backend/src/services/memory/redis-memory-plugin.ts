import { Redis } from 'ioredis';
import type { MemoryPlugin, CuratedContent, SearchQuery } from '../../types/memory-types';

export class RedisMemoryPlugin implements MemoryPlugin {
  constructor(
    private redis: Redis,
    private ttl: number = 86400 // 24 hours
  ) {}

  async store(key: string, content: CuratedContent): Promise<void> {
    await this.redis.setex(key, this.ttl, JSON.stringify(content));
  }

  async retrieve(key: string): Promise<CuratedContent | null> {
    const content = await this.redis.get(key);
    return content ? JSON.parse(content) : null;
  }

  async search(query: SearchQuery): Promise<CuratedContent[]> {
    const keys = await this.redis.keys(`${query.pattern}:*`);
    const contents = await Promise.all(
      keys.map(async key => {
        const content = await this.redis.get(key);
        return content ? JSON.parse(content) : null;
      })
    );
    
    return contents.filter((content): content is CuratedContent => content !== null);
  }

  async prune(olderThan: Date): Promise<void> {
    const now = Date.now();
    const cursor = '0';
    
    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH', 'content:*',
        'COUNT', 100
      );
      
      for (const key of keys) {
        const content = await this.retrieve(key);
        if (content && content.timestamp < olderThan.getTime()) {
          await this.redis.del(key);
        }
      }
      
      if (newCursor === '0') break;
    } while (true);
  }
}
