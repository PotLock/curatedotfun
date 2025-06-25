import {
  Json,
  ProcessingRepository,
  ProcessingStepStage,
  SelectFeed,
  SelectProcessingJob,
  SelectProcessingStep,
  StepError,
} from "@curatedotfun/shared-db";
import { DistributorConfig, TransformConfig } from "@curatedotfun/types";
import {
  NotFoundError,
  PluginError,
  ProcessorError,
} from "@curatedotfun/utils";
import { Logger } from "pino";
import { DistributionService } from "./distribution.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { TransformationService } from "./transformation.service";

interface ProcessConfig {
  transform?: TransformConfig[];
  distribute?: DistributorConfig[];
}

interface ProcessOptions {
  submissionId?: string;
  feedId?: string;
  idempotencyKey?: string;
  retryOfJobId?: string;
}

export class ProcessingService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private transformationService: TransformationService,
    private distributionService: DistributionService,
    private processingRepository: ProcessingRepository,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ProcessingService.name });
  }

  async process(
    content: unknown,
    config: ProcessConfig,
    options: ProcessOptions,
  ): Promise<SelectProcessingJob> {
    const { submissionId, feedId, idempotencyKey, retryOfJobId } = options;

    if (!submissionId || !feedId) {
      throw new ProcessorError(
        "missing_ids",
        "Submission ID and Feed ID are required for processing.",
      );
    }

    const job = await this.processingRepository.createJob({
      submissionId,
      feedId,
      idempotencyKey,
      status: "processing",
      startedAt: new Date(),
      retryOfJobId,
    });
    this.logger.info(
      { jobId: job.id, submissionId },
      "Processing job started.",
    );

    let currentContent: unknown = content;
    const distributorErrors: {
      distributor: DistributorConfig;
      error: Error;
    }[] = [];

    try {
      if (config.transform?.length) {
        currentContent = await this.executeTransforms(
          job.id,
          currentContent,
          config.transform,
          "global",
          1,
        );
      }

      if (!config.distribute?.length) {
        throw new ProcessorError(
          "no_distributors",
          "No distributors configured.",
        );
      }

      let stepOrder = (config.transform?.length || 0) + 1;
      for (const distributor of config.distribute) {
        try {
          await this.processDistributor(
            job.id,
            currentContent,
            distributor,
            stepOrder,
          );
        } catch (error) {
          distributorErrors.push({
            distributor,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          this.logger.error(
            {
              jobId: job.id,
              plugin: distributor.plugin,
              error,
            },
            "Distributor failed.",
          );
        }
        stepOrder += (distributor.transform?.length || 0) + 1;
      }

      if (distributorErrors.length === config.distribute.length) {
        throw new ProcessorError(
          "all_distributors_failed",
          "All distributors failed to process.",
        );
      }

      await this.processingRepository.updateJob(job.id, {
        status: "completed",
        completedAt: new Date(),
      });
      this.logger.info({ jobId: job.id }, "Processing job completed.");
    } catch (error) {
      await this.handleProcessingError(job.id, error);
      throw error;
    }
    return job;
  }

  private async processDistributor(
    jobId: string,
    input: unknown,
    distributor: DistributorConfig,
    startingStepOrder: number,
  ) {
    let distributorContent = input;
    if (distributor.transform?.length) {
      distributorContent = await this.executeTransforms(
        jobId,
        input,
        distributor.transform,
        "distributor",
        startingStepOrder,
      );
    }

    const distributionStepOrder =
      startingStepOrder + (distributor.transform?.length || 0);
    await this.executeDistribution(
      jobId,
      distributorContent,
      distributor,
      distributionStepOrder,
    );
  }

  private async executeTransforms(
    jobId: string,
    input: unknown,
    transforms: TransformConfig[],
    stage: ProcessingStepStage,
    startingStepOrder: number,
  ): Promise<unknown> {
    let currentContent = input;
    let stepOrder = startingStepOrder;

    for (const transform of transforms) {
      const step = await this.processingRepository.createStep({
        jobId,
        stepOrder,
        type: "transformation",
        stage,
        pluginName: transform.plugin,
        stepName: transform.plugin,
        config: transform.config as Json,
        status: "processing",
        input: currentContent as Json,
        startedAt: new Date(),
      });

      try {
        this.logger.info(
          {
            jobId,
            stepOrder,
            plugin: transform.plugin,
            input: currentContent,
          },
          "Applying transformation",
        );
        const output = await this.transformationService.applyTransforms(
          currentContent,
          [transform],
        );
        this.logger.info(
          {
            jobId,
            stepOrder,
            plugin: transform.plugin,
            output,
          },
          "Transformation complete",
        );
        await this.processingRepository.updateStep(step.id, {
          status: "success",
          output: output as Json,
          completedAt: new Date(),
        });
        currentContent = output;
      } catch (error) {
        const stepError: StepError = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          stepName:
            error instanceof PluginError
              ? error.context.pluginName
              : transform.plugin,
        };
        await this.processingRepository.updateStep(step.id, {
          status: "failed",
          error: stepError as Json,
          completedAt: new Date(),
        });
        this.logger.error(
          { jobId, stepId: step.id, plugin: transform.plugin, error },
          "Transformation step failed. Halting processing for this job.",
        );
        throw error;
      }
      stepOrder++;
    }
    return currentContent;
  }

  private async executeDistribution(
    jobId: string,
    input: unknown,
    distributor: DistributorConfig,
    stepOrder: number,
  ) {
    const step = await this.processingRepository.createStep({
      jobId,
      stepOrder,
      type: "distribution",
      stage: "distributor",
      pluginName: distributor.plugin,
      stepName: distributor.plugin,
      config: distributor.config as Json,
      status: "processing",
      input: input as Json,
      startedAt: new Date(),
    });

    try {
      const output = await this.distributionService.distributeContent(
        distributor,
        input,
      );
      await this.processingRepository.updateStep(step.id, {
        status: "success",
        output: output as Json,
        completedAt: new Date(),
      });
    } catch (error) {
      const stepError: StepError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        stepName: distributor.plugin,
      };
      await this.processingRepository.updateStep(step.id, {
        status: "failed",
        error: stepError as Json,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  private async handleProcessingError(jobId: string, error: unknown) {
    this.logger.error({ jobId, error }, "Processing job failed.");
    await this.processingRepository.updateJob(jobId, {
      status: "failed",
      completedAt: new Date(),
    });
  }

  async getJobsBySubmissionAndFeed(
    submissionId: string,
    feedId: string,
  ): Promise<SelectProcessingJob[]> {
    return this.processingRepository.getJobsBySubmissionAndFeed(
      submissionId,
      feedId,
    );
  }

  async getStepsByJobId(jobId: string): Promise<SelectProcessingStep[]> {
    return this.processingRepository.getStepsByJobId(jobId);
  }

  async getJobById(jobId: string): Promise<SelectProcessingJob | null> {
    return this.processingRepository.getJobById(jobId);
  }

  async getStepById(stepId: string): Promise<SelectProcessingStep | null> {
    return this.processingRepository.getStepById(stepId);
  }

  async retryStep(
    stepId: string,
    feed: SelectFeed & { config: { outputs: { stream: ProcessConfig } } },
  ): Promise<SelectProcessingJob> {
    const step = await this.processingRepository.getStepById(stepId);
    if (!step) {
      throw new NotFoundError("ProcessingStep", stepId);
    }

    if (step.status !== "failed") {
      throw new ProcessorError(
        "step_not_failed",
        "Only failed steps can be retried.",
      );
    }

    const originalJob = await this.processingRepository.getJobById(step.jobId);
    if (!originalJob) {
      throw new NotFoundError("ProcessingJob", step.jobId);
    }

    const partialConfig = this.reconstructConfigFromStep(
      feed.config.outputs.stream,
      step,
    );

    const content = step.input;

    const newJob = await this.process(content, partialConfig, {
      submissionId: originalJob.submissionId,
      feedId: originalJob.feedId,
      retryOfJobId: originalJob.id,
    });

    return newJob;
  }

  private reconstructConfigFromStep(
    fullConfig: ProcessConfig,
    failedStep: SelectProcessingStep,
  ): ProcessConfig {
    const newConfig: ProcessConfig = {
      transform: [],
      distribute: [],
    };

    if (failedStep.stage === "global") {
      // If a global transform fails, we need to restart the whole process
      return fullConfig;
    }

    if (failedStep.stage === "distributor") {
      const distributorIndex = fullConfig.distribute?.findIndex(
        (d) => d.plugin === failedStep.stepName,
      );

      if (distributorIndex !== undefined && distributorIndex > -1) {
        // If a distributor's transform failed, we restart that distributor
        if (failedStep.type === "transformation") {
          const distributorConfig = fullConfig.distribute?.[distributorIndex];
          if (distributorConfig) {
            newConfig.distribute?.push(distributorConfig);
          }
        } else {
          // If a distribution step failed, we restart from that distributor
          newConfig.distribute = fullConfig.distribute?.slice(distributorIndex);
        }
      }
    }

    return newConfig;
  }
}
