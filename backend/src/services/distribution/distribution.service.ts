import { PluginError, PluginExecutionError } from "../../types/errors";
import { ActionArgs } from "../../types/plugins";
import { TwitterSubmission } from "../../types/twitter";
import { logger } from "../../utils/logger";
import { ConfigService } from "../config";
import { PluginService } from "../plugins/plugin.service";
import { DistributorConfig } from "./../../types/config";

export class DistributionService {
  private pluginService: PluginService;
  private configService: ConfigService;

  constructor() {
    this.pluginService = PluginService.getInstance();
    this.configService = ConfigService.getInstance();
  }

  async transformContent<T = TwitterSubmission, U = string>(
    pluginName: string,
    input: T,
    config: Record<string, unknown>,
  ): Promise<U> {
    try {
      const plugin = await this.pluginService.getPlugin<"transform", T, U>(
        pluginName,
        {
          type: "transform",
          config: config || {},
        },
      );

      try {
        const args: ActionArgs<T, Record<string, unknown>> = {
          input,
          config,
        };
        return await plugin.transform(args);
      } catch (error) {
        throw new PluginExecutionError(pluginName, "transform", error as Error);
      }
    } catch (error) {
      logger.error(`Error transforming content with plugin ${pluginName}:`, {
        error,
        pluginName,
      });
      throw error;
    }
  }

  async distributeContent<T = TwitterSubmission>(
    distributor: DistributorConfig,
    input: T,
  ): Promise<void> {
    const { plugin: pluginName, config: pluginConfig } = distributor;
    try {
      const plugin = await this.pluginService.getPlugin<"distributor", T>(
        pluginName,
        {
          type: "distributor",
          config: pluginConfig || {},
        },
      );

      try {
        const args: ActionArgs<T, Record<string, unknown>> = {
          input,
          config: pluginConfig,
        };
        await plugin.distribute(args);
      } catch (error) {
        throw new PluginExecutionError(
          pluginName,
          "distribute",
          error as Error,
        );
      }
    } catch (error) {
      // Log but don't crash on plugin errors
      logger.error(`Error distributing content with plugin ${pluginName}:`, {
        error,
        pluginName,
      });

      // Only throw if it's not a plugin error (system error)
      if (!(error instanceof PluginError)) {
        throw error;
      }
    }
  }

  async processStreamOutput(
    feedId: string,
    submission: TwitterSubmission,
  ): Promise<void> {
    const submissionId = submission.tweetId;
    const content = submission.content;

    try {
      const feed = this.configService.getFeedConfig(feedId);
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
      let processedContent = content; // TODO: this isn't right, because something like Notion wants the submission object. But we don't want Telegram to send that object... although a transformation sohuld probably be required

      // interface TransformationPipeline<T, U> {
      //   input: T;
      //   transforms: Array<{
      //     plugin: string;
      //     outputType: 'raw' | 'structured';
      //     config?: Record<string, unknown>;
      //   }>;
      //   output: U;
      // }

      // Transform content if configured
      if (transform) {
        try {
          processedContent = await this.transformContent(
            transform.plugin,
            submission,
            transform.config,
          );
        } catch (error) {
          logger.error(
            `Error transforming content for feed ${feedId} with plugin ${transform.plugin}:`,
            {
              error,
              submissionId: submissionId,
              plugin: transform.plugin,
            },
          );
          // Continue with original content if transform fails
          processedContent = content;
        }
      }

      // Distribute to all configured outputs
      for (const dist of distribute) {
        await this.distributeContent(dist, processedContent);
      }
    } catch (error) {
      logger.error(`Error processing stream output for feed ${feedId}:`, {
        error,
        submissionId: submissionId,
      });
    }
  }

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
