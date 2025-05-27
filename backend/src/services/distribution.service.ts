import {
  ActionArgs,
  DistributorConfig,
  PluginError,
  PluginExecutionError,
  Submission,
} from "@curatedotfun/types";
import { Logger } from "pino";
import { isStaging } from "../services/config.service";
import { logger } from "../utils/logger";
import { sanitizeJson } from "../utils/sanitize";
import { IBaseService } from "./interfaces/base-service.interface";
import { PluginService } from "./plugin.service";

export class DistributionService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private pluginService: PluginService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async distributeContent<T = Submission>(
    distributor: DistributorConfig,
    input: T,
  ): Promise<void> {
    const sanitizedInput = sanitizeJson(input) as T;

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
          input: sanitizedInput,
          config: pluginConfig,
        };
        if (!isStaging) {
          await plugin.distribute(args);
        }
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

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
