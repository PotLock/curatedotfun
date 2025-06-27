import { DistributionResult, RichSubmission } from "@curatedotfun/shared-db";
import type { ActionArgs, DistributorConfig } from "@curatedotfun/types";
import { PluginError, PluginErrorCode } from "@curatedotfun/utils";
import type { Logger } from "pino";
import type { ConfigService } from "./config.service";
import { logPluginError } from "../utils/error";
import { sanitizeJson } from "../utils/sanitize";
import type { IBaseService } from "./interfaces/base-service.interface";
import { PluginService } from "./plugin.service";

export class DistributionService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private pluginService: PluginService,
    private configService: ConfigService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async distributeContent(
    distributor: DistributorConfig,
    input: unknown,
  ): Promise<DistributionResult> {
    const sanitizedInput = sanitizeJson(input);
    const { plugin: pluginName, config: pluginConfig } = distributor;
    try {
      const plugin = await this.pluginService.getPlugin<"distributor", unknown>(
        pluginName,
        {
          type: "distributor",
          config: pluginConfig || {},
        },
      );

      try {
        const args: ActionArgs<unknown, Record<string, unknown>> = {
          input: sanitizedInput,
          config: pluginConfig,
        };
        if (!this.configService.getFeatureFlag("enableDistribution")) {
          this.logger.info("Distribution skipped");
          return {
            success: true,
          };
        }

        await plugin.distribute(args);
        return { success: true };
      } catch (error) {
        const pluginError = new PluginError(
          error instanceof Error ? error.message : "Distribution failed",
          {
            pluginName,
            operation: "distribute",
            attempt: 1,
          },
          PluginErrorCode.PLUGIN_INTERNAL_ERROR,
          false, // Not retryable by default
          {
            cause: error instanceof Error ? error : undefined,
            details: {
              enableDistribution:
                this.configService.getFeatureFlag("enableDistribution"),
            },
          },
        );
        logPluginError(pluginError, this.logger);
        throw pluginError;
      }
    } catch (error) {
      if (error instanceof PluginError) {
        throw error;
      }

      const pluginError = new PluginError(
        "Plugin system error",
        {
          pluginName,
          operation: "system",
          attempt: 1,
        },
        PluginErrorCode.PLUGIN_INTERNAL_ERROR,
        false,
        {
          cause: error instanceof Error ? error : undefined,
          details: {
            enableDistribution:
              this.configService.getFeatureFlag("enableDistribution"),
          },
        },
      );
      logPluginError(pluginError, this.logger);
      throw pluginError;
    }
  }

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
