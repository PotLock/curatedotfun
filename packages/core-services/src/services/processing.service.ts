import {
  FeedRepository,
  Json,
  ProcessingPlan,
  ProcessingPlanStep,
  ProcessingRepository,
  SelectFeed,
  SelectProcessingJob,
  SelectProcessingStep,
  StepError,
  SubmissionRepository,
} from "@curatedotfun/shared-db";
import { DistributorConfig, TransformConfig } from "@curatedotfun/types";
import {
  NotFoundError,
  PluginError,
  ProcessorError,
} from "@curatedotfun/utils";
import { randomUUID } from "crypto";
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
  plan?: ProcessingPlan;
}

export class ProcessingService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private transformationService: TransformationService,
    private distributionService: DistributionService,
    private processingRepository: ProcessingRepository,
    private feedRepository: FeedRepository,
    private submissionRepository: SubmissionRepository,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ProcessingService.name });
  }

  async process(
    content: unknown,
    config: ProcessConfig,
    options: ProcessOptions,
  ): Promise<SelectProcessingJob> {
    const { submissionId, feedId, retryOfJobId } = options;
    const idempotencyKey = options.idempotencyKey ?? randomUUID();

    if (!submissionId || !feedId) {
      throw new ProcessorError(
        "missing_ids",
        "Submission ID and Feed ID are required for processing.",
      );
    }

    const plan = options.plan ?? this._buildPlan(config);

    const job = await this.processingRepository.createJob({
      submissionId,
      feedId,
      idempotencyKey,
      plan,
      status: "processing",
      startedAt: new Date(),
      retryOfJobId,
    });
    this.logger.info(
      { jobId: job.id, submissionId, hasPlan: !!plan },
      "Processing job started.",
    );

    let currentContent: unknown = content;
    const executedSteps: SelectProcessingStep[] = [];

    try {
      for (let i = 0; i < plan.length; i++) {
        const planStep = plan[i];
        const stepOrder = i + 1;

        if (planStep.type === "transformation") {
          const result = await this.executeTransform(
            job.id,
            currentContent,
            planStep,
            stepOrder,
          );
          executedSteps.push(result.step);
          currentContent = result.output;
        } else if (planStep.type === "distribution") {
          const step = await this.executeDistribution(
            job.id,
            currentContent,
            planStep,
            stepOrder,
          );
          executedSteps.push(step);
        }
      }

      const hasFailures = executedSteps.some((s) => s.status === "failed");
      const finalStatus = hasFailures ? "completed_with_errors" : "completed";

      const updatedJob = await this.processingRepository.updateJob(job.id, {
        status: finalStatus,
        completedAt: new Date(),
      });
      this.logger.info(
        { jobId: job.id, finalStatus },
        "Processing job finished.",
      );
      return updatedJob;
    } catch (error) {
      await this.handleProcessingError(job.id, error);
      throw error;
    }
  }

  private async executeTransform(
    jobId: string,
    input: unknown,
    planStep: ProcessingPlanStep,
    stepOrder: number,
  ): Promise<{ output: unknown; step: SelectProcessingStep }> {
    let step = await this.processingRepository.createStep({
      jobId,
      stepOrder,
      type: "transformation",
      stage: planStep.stage,
      pluginName: planStep.plugin,
      stepName: planStep.plugin,
      config: planStep.config as Json,
      status: "processing",
      input: input as Json,
      startedAt: new Date(),
    });

    try {
      const output = await this.transformationService.applyTransforms(input, [
        planStep as TransformConfig,
      ]);
      const updatedStep = await this.processingRepository.updateStep(step.id, {
        status: "success",
        output: output as Json,
        completedAt: new Date(),
      });
      return { output, step: updatedStep };
    } catch (error) {
      const stepError: StepError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        stepName:
          error instanceof PluginError
            ? error.context.pluginName
            : planStep.plugin,
      };
      await this.processingRepository.updateStep(step.id, {
        status: "failed",
        error: stepError as Json,
        completedAt: new Date(),
      });
      this.logger.error(
        { jobId, stepId: step.id, plugin: planStep.plugin, error },
        "Transformation step failed. Halting processing for this job.",
      );
      throw error;
    }
  }

  private async executeDistribution(
    jobId: string,
    input: unknown,
    planStep: ProcessingPlanStep,
    stepOrder: number,
  ): Promise<SelectProcessingStep> {
    const step = await this.processingRepository.createStep({
      jobId,
      stepOrder,
      type: "distribution",
      stage: "distributor",
      pluginName: planStep.plugin,
      stepName: planStep.plugin,
      config: planStep.config as Json,
      status: "processing",
      input: input as Json,
      startedAt: new Date(),
    });

    try {
      const output = await this.distributionService.distributeContent(
        planStep as DistributorConfig,
        input,
      );
      return this.processingRepository.updateStep(step.id, {
        status: "success",
        output: output as Json,
        completedAt: new Date(),
      });
    } catch (error) {
      const stepError: StepError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        stepName: planStep.plugin,
      };
      this.logger.warn(
        { jobId, stepId: step.id, plugin: planStep.plugin, error },
        "Distribution step failed. Continuing processing.",
      );
      return this.processingRepository.updateStep(step.id, {
        status: "failed",
        error: stepError as Json,
        completedAt: new Date(),
      });
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
    const stepToRetry = await this.processingRepository.getStepById(stepId);
    if (!stepToRetry) {
      throw new NotFoundError("ProcessingStep", stepId);
    }

    if (!["failed", "success"].includes(stepToRetry.status)) {
      throw new ProcessorError(
        "step_not_retryable",
        "Only failed or successful steps can be retried.",
      );
    }

    const originalJob = await this.processingRepository.getJobById(
      stepToRetry.jobId,
    );
    if (!originalJob) {
      throw new NotFoundError("ProcessingJob", stepToRetry.jobId);
    }
    if (!originalJob.plan) {
      throw new ProcessorError(
        "missing_plan",
        "Cannot retry a job that has no processing plan.",
      );
    }

    const plan = originalJob.plan as ProcessingPlan;
    const stepIndex = stepToRetry.stepOrder - 1;

    if (stepIndex < 0 || stepIndex >= plan.length) {
      throw new ProcessorError(
        "invalid_step_index",
        "Step to retry is out of bounds of the processing plan.",
      );
    }

    const partialPlan = plan.slice(stepIndex);
    const content = stepToRetry.input;

    return this.process(
      content,
      {},
      {
        submissionId: originalJob.submissionId,
        feedId: originalJob.feedId,
        retryOfJobId: originalJob.id,
        plan: partialPlan,
      },
    );
  }

  private _buildPlan(config: ProcessConfig): ProcessingPlan {
    const plan: ProcessingPlan = [];

    // Add global transforms
    config.transform?.forEach((t) => {
      plan.push({
        type: "transformation",
        stage: "global",
        plugin: t.plugin,
        config: t.config,
      });
    });

    // Add distributor transforms and distribution steps
    config.distribute?.forEach((d) => {
      d.transform?.forEach((t) => {
        plan.push({
          type: "transformation",
          stage: "distributor",
          plugin: t.plugin,
          config: t.config,
          distributorPlugin: d.plugin,
        });
      });
      plan.push({
        type: "distribution",
        stage: "distributor",
        plugin: d.plugin,
        config: d.config,
      });
    });

    return plan;
  }

  async reprocessWithLatestConfig(jobId: string): Promise<SelectProcessingJob> {
    const originalJob = await this.processingRepository.getJobById(jobId);
    if (!originalJob) {
      throw new NotFoundError("ProcessingJob", jobId);
    }

    const submission = await this.submissionRepository.getSubmission(
      originalJob.submissionId,
    );
    if (!submission) {
      throw new NotFoundError("Submission", originalJob.submissionId);
    }

    const feed = await this.feedRepository.findFeedById(originalJob.feedId);
    if (!feed?.config?.outputs?.stream) {
      throw new ProcessorError(
        "missing_config",
        `Feed ${originalJob.feedId} is missing a stream config.`,
      );
    }

    const newConfig = feed.config.outputs.stream;
    const content = submission.content;

    return this.process(content, newConfig, {
      submissionId: originalJob.submissionId,
      feedId: originalJob.feedId,
      retryOfJobId: originalJob.id,
    });
  }

  async tweakAndReprocessStep(
    stepId: string,
    newInput: string,
  ): Promise<SelectProcessingJob> {
    const stepToTweak = await this.processingRepository.getStepById(stepId);
    if (!stepToTweak) {
      throw new NotFoundError("ProcessingStep", stepId);
    }

    const originalJob = await this.processingRepository.getJobById(
      stepToTweak.jobId,
    );
    if (!originalJob?.plan) {
      throw new ProcessorError(
        "missing_plan",
        "Cannot tweak a step from a job that has no processing plan.",
      );
    }

    let parsedInput: unknown;
    try {
      parsedInput = JSON.parse(newInput);
    } catch (error) {
      throw new ProcessorError(
        "invalid_json_input",
        "The provided input string is not valid JSON.",
      );
    }

    const plan = originalJob.plan as ProcessingPlan;
    const stepIndex = stepToTweak.stepOrder - 1;
    const partialPlan = plan.slice(stepIndex);

    return this.process(
      parsedInput,
      {},
      {
        submissionId: originalJob.submissionId,
        feedId: originalJob.feedId,
        retryOfJobId: originalJob.id,
        plan: partialPlan,
      },
    );
  }
}
