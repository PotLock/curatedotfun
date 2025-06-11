import {
  DistributorConfig,
  RichSubmission,
  TransformConfig,
} from "@curatedotfun/shared-db";
import { ProcessorError, TransformError } from "@curatedotfun/utils";
import { Logger } from "pino";
import { logger } from "../utils/logger";
import { sanitizeJson } from "../utils/sanitize";
import { DistributionService } from "./distribution.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { TransformationService } from "./transformation.service.js";

export interface ProcessConfig {
  enabled?: boolean;
  transform?: TransformConfig[];
  distribute?: DistributorConfig[];
}

export class ProcessorService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private transformationService: TransformationService,
    private distributionService: DistributionService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  /**
   * Process content through transformation pipeline and distribute
   */
  async process(
    content: RichSubmission,
    config: ProcessConfig,
    feedId: string,
  ) {
    try {
      // Apply global transforms if any
      let processed = content;
      if (config.transform?.length) {
        try {
          processed = await this.transformationService.applyTransforms(
            processed,
            config.transform,
            "global",
            feedId,
          );

          processed = sanitizeJson(processed);
        } catch (error) {
          if (error instanceof TransformError) {
            logger.error("Global transform failed:", error);
            // Continue with original content on global transform error
            processed = content;
          } else {
            throw error;
          }
        }
      }

      // For each distributor, apply its transforms and distribute
      if (!config.distribute?.length) {
        throw new ProcessorError("unknown", "No distributors configured");
      }

      const errors: Error[] = [];
      for (const distributor of config.distribute) {
        try {
          // Start with the globally transformed content
          let distributorContent = processed;

          // Apply distributor-specific transforms if any
          if (distributor.transform?.length) {
            try {
              distributorContent =
                await this.transformationService.applyTransforms(
                  distributorContent,
                  distributor.transform,
                  "distributor",
                  feedId,
                );
              distributorContent = sanitizeJson(distributorContent);
            } catch (error) {
              if (error instanceof TransformError) {
                logger.error(
                  `Distributor transform failed for ${distributor.plugin}:`,
                  error,
                );
                // Continue with globally transformed content on distributor transform error
                distributorContent = processed;
              } else {
                throw error;
              }
            }
          }

          // Send to distributor
          await this.distributionService.distributeContent(
            distributor,
            distributorContent,
            feedId,
          );
        } catch (error) {
          // Collect errors but continue with other distributors
          errors.push(
            error instanceof Error ? error : new Error(String(error)),
          );
          logger.error(
            `Failed to process distributor ${distributor.plugin}:`,
            error,
          );
        }
      }

      // If all distributors failed, throw an error
      if (errors.length === config.distribute.length) {
        throw new ProcessorError("unknown", "All distributors failed");
      }
    } catch (error) {
      // Wrap any unknown errors
      if (error instanceof ProcessorError || error instanceof TransformError) {
        throw error;
      }
      throw new ProcessorError(
        "unknown",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Process a batch of content (like for recaps)
   * Each item goes through the transformation pipeline independently
   * but the results are collected and can be transformed together before distribution
   */
  async processBatch(
    items: any[],
    config: ProcessConfig & {
      batchTransform?: TransformConfig[];
    },
    feedId: string,
  ) {
    try {
      // Process each item through global and distributor transforms
      const results = await Promise.all(
        items.map(async (item) => {
          try {
            // Apply global transforms
            let processed = item;
            if (config.transform?.length) {
              processed = await this.transformationService.applyTransforms(
                processed,
                config.transform,
                "global",
                feedId,
              );

              processed = sanitizeJson(processed);
            }
            return processed;
          } catch (error) {
            logger.error("Item processing failed:", error);
            return item; // Continue with original item on error
          }
        }),
      );

      // Apply any batch transforms to the collected results
      let batchResult = results;
      if (config.batchTransform?.length) {
        try {
          logger.info("Applying batch transforms");
          batchResult = await this.transformationService.applyTransforms(
            results,
            config.batchTransform,
            "batch",
            feedId,
          );

          batchResult = sanitizeJson(batchResult);
        } catch (error) {
          if (error instanceof TransformError) {
            logger.error("Batch transform failed:", error);
            batchResult = results; // Continue with untransformed batch on error
          } else {
            throw error;
          }
        }
      }

      // Distribute the results
      if (!config.distribute?.length) {
        throw new ProcessorError("unknown", "No distributors configured");
      }

      const errors: Error[] = [];
      for (const distributor of config.distribute) {
        try {
          // Apply distributor-specific transforms
          let distributorContent = batchResult;
          if (distributor.transform?.length) {
            distributorContent =
              await this.transformationService.applyTransforms(
                distributorContent,
                distributor.transform,
                "distributor",
                feedId,
              );

            distributorContent = sanitizeJson(distributorContent);
          }

          // Send to distributor
          await this.distributionService.distributeContent(
            distributor,
            distributorContent,
            feedId,
          );
        } catch (error) {
          errors.push(
            error instanceof Error ? error : new Error(String(error)),
          );
          logger.error(
            `Failed to process distributor ${distributor.plugin}:`,
            error,
          );
        }
      }

      // If all distributors failed, throw an error
      if (errors.length === config.distribute.length) {
        throw new ProcessorError("unknown", "All distributors failed");
      }
    } catch (error) {
      if (error instanceof ProcessorError || error instanceof TransformError) {
        throw error;
      }
      throw new ProcessorError(
        "unknown",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }
}
