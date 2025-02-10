import { TwitterSubmission } from "types/twitter";
import { AppConfig, PluginConfig, PluginsConfig } from "../../types/config";
import { logger } from "../../utils/logger";
import { db } from "../db";
import { PluginLoader } from "../plugin-loader";
import { TransformerPlugin, DistributorPlugin } from "@curatedotfun/types";

export class DistributionService {
  private pluginLoader: PluginLoader;

  constructor() {
    // Reload plugins every minute in development
    this.pluginLoader = new PluginLoader(
      process.env.NODE_ENV === "development" ? 60 * 1000 : 5 * 60 * 1000
    );
  }

  async initialize(config: PluginsConfig): Promise<void> {
    // Load all plugins
    for (const [name, pluginConfig] of Object.entries(config)) {
      try {
        await this.pluginLoader.loadPlugin(name, pluginConfig);
      } catch (error) {
        logger.error(`Failed to load plugin ${name}:`, error);
      }
    }
  }


  async transformContent(
    pluginName: string,
    submission: TwitterSubmission,
    config: Record<string, unknown>,
  ): Promise<string> {
    try {
      const transformer = await this.pluginLoader.loadPlugin<"transform", string, string>(
        pluginName,
        {
          url: config.url as string,
          type: "transform",
          config,
        }
      ) as TransformerPlugin;

      return await transformer.transform(submission.content);
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
    config: Record<string, unknown>,
  ): Promise<void> {
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

      const distributor = await this.pluginLoader.loadPlugin<"distributor", string>(
        pluginName,
        {
          url: config.url as string,
          type: "distributor",
          config,
        }
      ) as DistributorPlugin;

      await distributor.distribute({ input: submission.content });
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
    // Clear the plugin cache
    this.pluginLoader.clearCache();
  }
}
