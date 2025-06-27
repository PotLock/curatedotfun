import type { ActionArgs, TransformConfig } from "@curatedotfun/types";
import { PluginError, PluginErrorCode } from "@curatedotfun/utils";
import { merge } from "lodash";
import type { Logger } from "pino";
import { logPluginError } from "../utils/error";
import { sanitizeJson } from "../utils/sanitize";
import { IBaseService } from "./interfaces/base-service.interface";
import { PluginService } from "./plugin.service";

export class TransformationService implements IBaseService {
  public readonly logger: Logger;
  constructor(
    private pluginService: PluginService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  /**
   * Combines transform results, merging objects or returning the new result
   */
  private combineResults(prevResult: unknown, newResult: unknown): unknown {
    // If both are objects (not arrays), merge them with new values taking precedence
    if (
      typeof prevResult === "object" &&
      prevResult !== null &&
      !Array.isArray(prevResult) &&
      typeof newResult === "object" &&
      newResult !== null &&
      !Array.isArray(newResult)
    ) {
      return merge({}, prevResult, newResult);
    }

    // Otherwise return the new result (string will just return)
    return newResult;
  }

  /**
   * Apply a series of transformations to content
   */
  async applyTransforms(content: unknown, transforms: TransformConfig[] = []) {
    let result = content;

    for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];
      try {
        const plugin = await this.pluginService.getPlugin(transform.plugin, {
          type: "transformer",
          config: transform.config,
        });

        const args: ActionArgs<unknown, Record<string, unknown>> = {
          input: result,
          config: transform.config,
        };

        this.logger.info(
          `Applying transform #${i + 1} (${transform.plugin}), args: ${JSON.stringify(args)}`,
        );
        const transformResult = await plugin.transform(args);

        // Validate transform output
        if (transformResult === undefined || transformResult === null) {
          const pluginError = new PluginError(
            "Transform returned null or undefined",
            {
              pluginName: transform.plugin,
              operation: "transform",
              attempt: i + 1,
            },
            PluginErrorCode.PLUGIN_OUTPUT_VALIDATION_FAILED,
            false, // Not retryable - plugin should be fixed
          );
          logPluginError(pluginError, this.logger, {
            context: { transformIndex: i },
          });
          throw pluginError;
        }

        const sanitizedResult = sanitizeJson(transformResult);

        // Combine results, either merging objects or using new result
        result = this.combineResults(result, sanitizedResult);
      } catch (error) {
        if (error instanceof PluginError) {
          logPluginError(error, this.logger, {
            context: { transformIndex: i },
          });
          throw error;
        }

        const pluginError = new PluginError(
          error instanceof Error ? error.message : "Unknown transform error",
          {
            pluginName: transform.plugin,
            operation: "transform",
            attempt: i + 1,
          },
          PluginErrorCode.PLUGIN_INTERNAL_ERROR,
          false, // Not retryable by default
          {
            cause: error instanceof Error ? error : undefined,
            details: { transformIndex: i },
          },
        );
        logPluginError(pluginError, this.logger);
        throw pluginError;
      }
    }

    return result;
  }

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
