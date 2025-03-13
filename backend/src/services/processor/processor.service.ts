import { DistributorConfig, TransformConfig } from "../../types/config";
import { ProcessorError, TransformError } from "../../types/errors";
import { DistributionService } from "../distribution/distribution.service";
import { TransformationService } from "../transformation/transformation.service";
import { logger } from "../../utils/logger";
import { sanitizeJson } from "../../utils/sanitize";

interface ProcessConfig {
  enabled?: boolean;
  transform?: TransformConfig[];
  distribute?: DistributorConfig[];
}

export class ProcessorService {
  constructor(
    private transformationService: TransformationService,
    private distributionService: DistributionService,
  ) {}

  /**
   * Process content through transformation pipeline and distribute
   * Can be used for both individual submissions and bulk content (like recaps)
   */
  async process(content: any, config: ProcessConfig) {
    try {
      // Apply global transforms if any
      let processed = content;
      if (config.transform?.length) {
        try {
          processed = await this.transformationService.applyTransforms(
            processed,
            config.transform,
            "global",
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

      // 2. For each distributor, apply its transforms and distribute
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
        throw new ProcessorError(
          "unknown",
          "All distributors failed",
          new AggregateError(errors),
        );
      }
    } catch (error) {
      // Wrap any unknown errors
      if (error instanceof ProcessorError || error instanceof TransformError) {
        throw error;
      }
      throw new ProcessorError(
        "unknown",
        error instanceof Error ? error.message : "Unknown error",
        error instanceof Error ? error : undefined,
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
      batchTransform?: TransformConfig[]; // Optional transforms to apply to collected results
    },
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
              );

            distributorContent = sanitizeJson(distributorContent);
          }

          // Send to distributor
          await this.distributionService.distributeContent(
            distributor,
            distributorContent,
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
        throw new ProcessorError(
          "unknown",
          "All distributors failed",
          new AggregateError(errors),
        );
      }
    } catch (error) {
      if (error instanceof ProcessorError || error instanceof TransformError) {
        throw error;
      }
      throw new ProcessorError(
        "unknown",
        error instanceof Error ? error.message : "Unknown error",
        error instanceof Error ? error : undefined,
      );
    }
  }
}
