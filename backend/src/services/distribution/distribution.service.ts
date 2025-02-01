import { AppConfig, PluginConfig, PluginsConfig } from "../../types/config";
import { Plugin, PluginModule } from "../../types/plugin";
import { logger } from "../../utils/logger";
import { db } from "../db";

export class DistributionService {
  private plugins: Map<string, Plugin> = new Map();

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  registerPlugin(name: string, plugin: Plugin): void {
    this.plugins.set(name, plugin);
    logger.info(`Successfully registered plugin: ${name}`);
  }

  async initialize(config: PluginsConfig): Promise<void> {
    // Load all plugins
    for (const [name, pluginConfig] of Object.entries(config)) {
      try {
        await this.loadPlugin(name, pluginConfig);
      } catch (error) {
        logger.error(`Failed to load plugin ${name}:`, error);
      }
    }
  }

  private async loadPlugin(name: string, config: PluginConfig): Promise<void> {
    try {
      // Dynamic import of plugin from URL
      const module = (await import(config.url)) as PluginModule;

      // Create plugin instance with database operations if needed
      const plugin = new module.default(db.getOperations());

      // Store the plugin instance
      this.plugins.set(name, plugin);

      logger.info(`Successfully loaded plugin: ${name}`);
    } catch (error) {
      logger.error(`Error loading plugin ${name}:`, error);
      throw error;
    }
  }

  async transformContent(
    pluginName: string,
    content: string,
    config: { prompt: string },
  ): Promise<string> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !("transform" in plugin)) {
      throw new Error(`Transformer plugin ${pluginName} not found or invalid`);
    }

    try {
      await plugin.initialize(config);
      return await plugin.transform(content);
    } catch (error) {
      logger.error(
        `Error transforming content with plugin ${pluginName}:`,
        error,
      );
      throw error;
    }
  }

  async distributeContent(
    feedId: string,
    pluginName: string,
    content: string,
    config: Record<string, string>,
  ): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !("distribute" in plugin)) {
      throw new Error(`Distributor plugin ${pluginName} not found or invalid`);
    }

    try {
      // Get plugin config
      const storedPlugin = db.getFeedPlugin(feedId, pluginName);
      if (!storedPlugin) {
        // Store initial config
        db.upsertFeedPlugin(feedId, pluginName, config);
      } else {
        // Use stored config
        config = JSON.parse(storedPlugin.config);
      }

      await plugin.initialize(feedId, config);
      await plugin.distribute(feedId, content);
    } catch (error) {
      logger.error(
        `Error distributing content with plugin ${pluginName}:`,
        error,
      );
      throw error;
    }
  }

  async processStreamOutput(
    feedId: string,
    submissionId: string,
    content: string,
  ): Promise<void> {
    const config = await this.getConfig();
    const feed = config.feeds.find((f) => f.id === feedId);
    if (!feed?.outputs.stream?.enabled) {
      return;
    }

    const { transform, distribute } = feed.outputs.stream;

    // Stream must have at least one distribution configured
    if (!distribute?.length) {
      throw new Error(
        `Stream output for feed ${feedId} requires at least one distribution configuration`,
      );
    }

    // Transform content if configured
    let processedContent = content;
    if (transform) {
      processedContent = await this.transformContent(
        transform.plugin,
        content,
        transform.config,
      );
    }

    // Distribute to all configured outputs
    for (const dist of distribute) {
      await this.distributeContent(
        feedId,
        dist.plugin,
        processedContent,
        dist.config,
      );
    }
    if (!feed?.outputs.recap?.enabled) {
      // Remove from submission feed after successful distribution if no recap
      db.removeFromSubmissionFeed(submissionId, feedId);
    }
  }

  // TODO: adjust recap, needs to be called from cron job.
  // It should take feedId, grab all of the contents currently in queue,
  // Transform & Distribute
  // Then clear queue
  async processRecapOutput(feedId: string): Promise<void> {
    const config = await this.getConfig();
    const feed = config.feeds.find((f) => f.id === feedId);
    if (!feed?.outputs.recap?.enabled) {
      return;
    }

    const { transform, distribute } = feed.outputs.recap;

    if (!distribute?.length) {
      throw new Error(
        `Recap output for feed ${feedId} requires distribution configuration`,
      );
    }

    if (!transform) {
      throw new Error(
        `Recap output for feed ${feedId} requires transform configuration`,
      );
    }

    // TODO: adjust recap, needs to be called from cron job.
    // It should take feedId, grab all of the contents currently in queue,
    // Transform & Distribute
    // Then remove

    const content = "";

    // Transform content (required for recap)
    const processedContent = await this.transformContent(
      transform.plugin,
      content,
      transform.config,
    );

    // Distribute to all configured outputs
    for (const dist of distribute) {
      await this.distributeContent(
        feedId,
        dist.plugin,
        processedContent,
        dist.config,
      );
    }

    // Remove from submission feed after successful recap
    // db.removeFromSubmissionFeed(submissionId, feedId);
  }

  private async getConfig(): Promise<AppConfig> {
    const { ConfigService } = await import("../config");
    return ConfigService.getInstance().getConfig();
  }

  async shutdown(): Promise<void> {
    // Shutdown all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        if (plugin.shutdown) {
          await plugin.shutdown();
        }
      } catch (error) {
        logger.error(`Error shutting down plugin ${name}:`, error);
      }
    }
    this.plugins.clear();
  }
}
