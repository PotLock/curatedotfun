import { ActionArgs } from "@curatedotfun/types";
import { PluginError, PluginExecutionError } from "../../types/errors";
import { Submission } from "../../types/twitter";
import { logger } from "../../utils/logger";
import { sanitizeJson } from "../../utils/sanitize";
import { PluginService } from "../plugins/plugin.service";
import { DistributorConfig } from "./../../types/config";

export class DistributionService {
  constructor(private pluginService: PluginService) {}

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

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
