import { TransformConfig } from "../../types/config";
import { TransformError } from "../../types/errors";
import { PluginService } from "../plugins/plugin.service";
import { logger } from "../../utils/logger";
import { sanitizeJson } from "../../utils/sanitize";
import { ActionArgs } from "@curatedotfun/types";
import { merge } from "lodash";

export type TransformStage = "global" | "distributor" | "batch";

export class TransformationService {
  constructor(private pluginService: PluginService) {}

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
  async applyTransforms(
    content: any,
    transforms: TransformConfig[] = [],
    stage: TransformStage = "global",
  ) {
    let result = content;

    for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];
      try {
        const plugin = await this.pluginService.getPlugin(transform.plugin, {
          type: "transformer",
          config: transform.config,
        });

        const args: ActionArgs<any, Record<string, unknown>> = {
          input: result,
          config: transform.config,
        };

        logger.debug(
          `Applying ${stage} transform #${i + 1} (${transform.plugin})`,
        );
        const transformResult = await plugin.transform(args);

        // Validate transform output
        if (transformResult === undefined || transformResult === null) {
          throw new TransformError(
            transform.plugin,
            stage,
            i,
            "Transform returned null or undefined",
          );
        }

        const sanitizedResult = sanitizeJson(transformResult);

        // Combine results, either merging objects or using new result
        result = this.combineResults(result, sanitizedResult);
      } catch (error) {
        // If it's already a TransformError, rethrow it
        if (error instanceof TransformError) {
          throw error;
        }

        // Otherwise wrap it in a TransformError
        throw new TransformError(
          transform.plugin,
          stage,
          i,
          error instanceof Error ? error.message : "Unknown error",
          error instanceof Error ? error : undefined,
        );
      }
    }

    return result;
  }

  async shutdown(): Promise<void> {
    await this.pluginService.cleanup();
  }
}
