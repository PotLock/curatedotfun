import { TwitterSubmission } from "types/twitter";
import { AppConfig, PluginsConfig } from "../../types/config";
import {
  ActionArgs,
  PluginConfig
} from "../../types/plugins";
import { logger } from "../../utils/logger";
import { PluginService } from "../plugins/plugin.service";

export class DistributionService {
  private pluginService: PluginService;

  constructor() {
    this.pluginService = PluginService.getInstance();
  }

  async initialize(pluginsConfig: PluginsConfig): Promise<void> {
    const configs: Record<string, PluginConfig<"transform" | "distributor">> = {};

    // Convert config to proper format
    for (const [name, conf] of Object.entries(pluginsConfig)) {
      if (conf.type === "distributor" || conf.type === "transform") {
        const pluginConfig = typeof conf.config === 'string' ? JSON.parse(conf.config) : (conf.config || {});
        configs[name] = {
          type: conf.type,
          url: conf.url,
          config: pluginConfig,
        };
      }
    }

    await this.pluginService.initializePlugins(configs);
  }

  async transformContent<T = TwitterSubmission, U = string>(
    pluginName: string,
    input: T,
    config: Record<string, unknown>,
  ): Promise<U> {
    const plugin = this.pluginService.getPlugin<"transform", T, U>(
      pluginName
    );
    if (!plugin) {
      logger.error(`Transformer plugin ${pluginName} not found or invalid`);
      throw new Error(`Transformer plugin ${pluginName} not found or invalid`);
    }

    try {
      const args: ActionArgs<T, Record<string, unknown>> = {
        input,
        config,
      };
      return await plugin.transform(args);
    } catch (error) {
      logger.error(`Error transforming content with plugin ${pluginName}:`, {
        error,
        pluginName,
      });
      throw error;
    }
  }

  async distributeContent<T = TwitterSubmission>(
    feedId: string,
    pluginName: string,
    input: T,
    config: Record<string, unknown>,
  ): Promise<void> {
    const plugin = this.pluginService.getPlugin<"distributor", T>(
      pluginName
    );
    if (!plugin) {
      logger.error(`Distributor plugin ${pluginName} not found or invalid`);
      return;
    }

    try {
      const args: ActionArgs<T, Record<string, unknown>> = {
        input,
        config,
      };
      await plugin.distribute(args);
    } catch (error) {
      logger.error(`Error distributing content with plugin ${pluginName}:`, {
        error,
        feedId,
        pluginName,
      });
    }
  }

  async processStreamOutput(
    feedId: string,
    submission: TwitterSubmission,
  ): Promise<void> {
    try {
      // TODO: Replace with get feed config, or pass it in/handle outside
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
      let processedContent = submission;
      if (transform) {
        try {
          processedContent = await this.transformContent(
            transform.plugin,
            submission,
            transform.config,
          );
        } catch (error) {
          logger.error(`Error transforming content for feed ${feedId} with plugin ${transform.plugin}:`, {
            error,
            submissionId: submission.tweetId,
            plugin: transform.plugin,
          });
          // Continue with original content if transform fails
          processedContent = submission;
        }
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
    } catch (error) {
      logger.error(`Error processing stream output for feed ${feedId}:`, {
        error,
        submissionId: submission.tweetId,
      });
    }
  }

  private async getConfig(): Promise<AppConfig> {
    const { ConfigService } = await import("../config");
    return ConfigService.getInstance().getConfig();
  }

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
