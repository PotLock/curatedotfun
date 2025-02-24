import { TwitterSubmission } from "types/twitter";
import { AppConfig, PluginConfig, PluginsConfig } from "../../types/config";
import { Plugin, PluginModule } from "../../types/plugin";
import { logger } from "../../utils/logger";
import { db } from "../db";

export class DistributionService {
  private plugins: Map<string, Plugin> = new Map();

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
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
      logger.error(`Error loading plugin ${name}:`, {
        error,
        pluginUrl: config.url,
      });
    }
  }

  async transformContent(
    pluginName: string,
    submission: TwitterSubmission,
    config: any,
  ): Promise<string> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !("transform" in plugin)) {
      logger.error(`Transformer plugin ${pluginName} not found or invalid`);
      return submission.content;
    }

    try {
      await plugin.initialize(config);
      return await plugin.transform(submission);
    } catch (error) {
      logger.error(`Error transforming content with plugin ${pluginName}:`, {
        error,
        submissionId: submission.tweetId,
        pluginName,
      });
      // Return original content if transformation fails
      return submission.content;
    }
  }

  async distributeContent(
    feedId: string,
    pluginName: string,
    submission: TwitterSubmission,
    config: Record<string, string>,
  ): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !("distribute" in plugin)) {
      logger.error(`Distributor plugin ${pluginName} not found or invalid`);
      return;
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
      await plugin.distribute(feedId, submission);
    } catch (error) {
      logger.error(`Error distributing content with plugin ${pluginName}:`, {
        error,
        feedId,
        submissionId: submission.tweetId,
        pluginName,
      });
    }
  }

  async processStreamOutput(
    feedId: string,
    submission: TwitterSubmission,
  ): Promise<void> {
    try {
      const config = await this.getConfig();
      const feed = config.feeds.find((f) => f.id === feedId);
      if (!feed?.outputs.stream?.enabled) {
        return;
      }

      const { transform, distribute } = feed.outputs.stream;

      // Stream must have at least one distribution configured
      if (!distribute?.length) {
        logger.error(
          `Stream output for feed ${feedId} requires at least one distribution configuration`,
        );
        return;
      }

      // Transform content if configured
      let processedContent = submission.content;
      if (transform) {
        try {
          processedContent = await this.transformContent(
            transform.plugin,
            submission,
            transform.config,
          );
        } catch (error) {
          logger.error(`Error transforming content for feed ${feedId}:`, {
            error,
            submissionId: submission.tweetId,
            plugin: transform.plugin,
          });
          // Continue with original content if transform fails
          processedContent = submission.content;
        }
      }

      // Distribute to all configured outputs
      for (const dist of distribute) {
        await this.distributeContent(
          feedId,
          dist.plugin,
          { ...submission, content: processedContent },
          dist.config,
        );
      }
    } catch (error) {
      logger.error(`Error processing stream output for feed ${feedId}:`, {
        error,
        submissionId: submission.tweetId,
      });
    }
  }

  // TODO: adjust recap, needs to be called from cron job.
  // It should take feedId, grab all of the contents currently in queue,
  // Transform & Distribute
  // Then clear queue
  async processRecapOutput(feedId: string): Promise<void> {
    try {
      const config = await this.getConfig();
      const feed = config.feeds.find((f) => f.id === feedId);
      if (!feed?.outputs.recap?.enabled) {
        return;
      }

      const { transform, distribute } = feed.outputs.recap;

      if (!distribute?.length) {
        logger.error(
          `Recap output for feed ${feedId} requires distribution configuration`,
        );
        return;
      }

      if (!transform) {
        logger.error(
          `Recap output for feed ${feedId} requires transform configuration`,
        );
        return;
      }

      // TODO: adjust recap, needs to be called from cron job.
      // It should take feedId, grab all of the contents currently in queue,
      // Transform & Distribute
      // Then remove

      // const content = "";

      // // Transform content (required for recap)
      // const processedContent = await this.transformContent(
      //   transform.plugin,
      //   content,
      //   transform.config,
      // );

      // // Distribute to all configured outputs
      // for (const dist of distribute) {
      //   await this.distributeContent(
      //     feedId,
      //     dist.plugin,
      //     processedContent,
      //     dist.config,
      //   );
      // }

      // Remove from submission feed after successful recap
      // db.removeFromSubmissionFeed(submissionId, feedId);
    } catch (error) {
      logger.error(`Error processing recap output for feed ${feedId}:`, {
        error,
        feedId,
      });
    }
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
