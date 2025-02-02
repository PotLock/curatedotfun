import { injectable, inject } from 'tsyringe';
import type { MemoryPlugin, MemoryConfig, CuratedContent } from '../../types/memory-types';

@injectable()
export class MemoryService {
  private plugins: MemoryPlugin[] = [];
  constructor(@inject('memory') private config: MemoryConfig) {
    this.config = config;
  }

  async storeContent(content: CuratedContent): Promise<void> {
    const storageKey = this.generateStorageKey(content);
    await Promise.all(
      this.plugins.map(plugin => 
        plugin.store(storageKey, content)
      )
    );
  }

  registerPlugin(plugin: MemoryPlugin): void {
    this.plugins.push(plugin);
  }

  private generateStorageKey(content: CuratedContent): string {
    return `content:${content.id}`;
  }
}
