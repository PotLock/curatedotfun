import { ArchivePlugin, FeedArchiveItem } from "../../types/archive";
import { logger } from "../../utils/logger";

export class ArchiveService {
  private plugins: Map<string, ArchivePlugin> = new Map();
  private activePlugin?: ArchivePlugin;

  async initialize(config: {
    plugin: string;
    config: Record<string, string>;
  }): Promise<void> {
    try {
      await this.loadPlugin(config.plugin, config.config);
    } catch (error) {
      logger.error(`Failed to load archive plugin ${config.plugin}:`, error);
    }
  }

  private async loadPlugin(name: string, config: Record<string, string>): Promise<void> {
    try {
      // Dynamic import of plugin 
      // TODO: Introduce plugin registry
      const module = await import("./external/supabase-archive");
      
      // Create plugin instance with database operations if needed
      const plugin = new module.default();
      
      // Store the plugin instance
      this.plugins.set(name, plugin);
      this.activePlugin = plugin;
      
      // Initialize the plugin
      await plugin.initialize(config);
      
      logger.info(`Successfully loaded archive plugin: ${name}`);
    } catch (error) {
      logger.error(`Error loading archive plugin ${name}:`, error);
      throw error;
    }
  }

  async archiveFeedItem(feedItem: Partial<FeedArchiveItem> & { id: string }): Promise<FeedArchiveItem> {
    if (!this.activePlugin) {
      throw new Error('No active archive plugin found');
    }
    return await this.activePlugin.archiveFeedItem(feedItem);
  }

  async getFeedItemsBySubmitter(submittedBy: string): Promise<FeedArchiveItem[]> {
    if (!this.activePlugin) {
      throw new Error('No active archive plugin found');
    }
    return await this.activePlugin.getFeedItemsBySubmitter(submittedBy);
  }

  async getFeedItemsByStatus(status: string): Promise<FeedArchiveItem[]> {
    if (!this.activePlugin) {
      throw new Error('No active archive plugin found');
    }
    return await this.activePlugin.getFeedItemsByStatus(status);
  }

  async getFeedItemsByApprover(approverId: string): Promise<FeedArchiveItem[]> {
    if (!this.activePlugin) {
      throw new Error('No active archive plugin found');
    }
    return await this.activePlugin.getFeedItemsByApprover(approverId);
  }

  async getFeedStats() {
    if (!this.activePlugin) {
      throw new Error('No active archive plugin found');
    }
    return await this.activePlugin.getFeedStats();
  }

  async shutdown(): Promise<void> {
    // Shutdown all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        if (plugin.shutdown) {
          await plugin.shutdown();
        }
      } catch (error) {
        logger.error(`Error shutting down archive plugin ${name}:`, error);
      }
    }
    this.plugins.clear();
    this.activePlugin = undefined;
  }
}
