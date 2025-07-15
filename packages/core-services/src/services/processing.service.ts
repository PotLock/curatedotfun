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

    const executedSteps: SelectProcessingStep[] = [];
    try {
      let globalOutput: unknown = content;

      const planWithOrder = plan.map((step, index) => ({
        ...step,
        order: index + 1,
      }));

      const globalStepsWithOrder: typeof planWithOrder = [];
      const branchesWithOrder = new Map<string, typeof planWithOrder>();

      for (const step of planWithOrder) {
        if (step.branchId) {
          if (!branchesWithOrder.has(step.branchId)) {
            branchesWithOrder.set(step.branchId, []);
          }
          branchesWithOrder.get(step.branchId)!.push(step);
        } else {
          globalStepsWithOrder.push(step);
        }
      }

      for (const planStep of globalStepsWithOrder) {
        if (planStep.type === "transformation") {
          const result = await this.executeTransform(
            job.id,
            globalOutput,
            planStep,
            planStep.order,
          );
          executedSteps.push(result.step);
          globalOutput = result.output;
        } else if (planStep.type === "distribution") {
          const step = await this.executeDistribution(
            job.id,
            globalOutput,
            planStep,
            planStep.order,
          );
          executedSteps.push(step);
        }
      }

      const branchPromises = Array.from(branchesWithOrder.values()).map(
        async (branch) => {
          const branchExecutedSteps: SelectProcessingStep[] = [];
          let branchContent = globalOutput;
          for (const planStep of branch) {
            if (planStep.type === "transformation") {
              const result = await this.executeTransform(
                job.id,
                branchContent,
                planStep,
                planStep.order,
              );
              branchExecutedSteps.push(result.step);
              branchContent = result.output;
            } else if (planStep.type === "distribution") {
              const step = await this.executeDistribution(
                job.id,
                branchContent,
                planStep,
                planStep.order,
              );
              branchExecutedSteps.push(step);
            }
          }
          return branchExecutedSteps;
        },
      );

      const branchesExecutedSteps = await Promise.all(branchPromises);
      branchesExecutedSteps.forEach((branchSteps) => {
        executedSteps.push(...branchSteps);
      });

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

    const stepToRetryDetails = plan[stepIndex];
    let partialPlan: ProcessingPlan;

    if (stepToRetryDetails.branchId) {
      partialPlan = plan
        .slice(stepIndex)
        .filter((step) => step.branchId === stepToRetryDetails.branchId);
    } else {
      // Fallback for old plans without branchId
      partialPlan = plan.slice(stepIndex);
    }
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
      const branchId = randomUUID();
      d.transform?.forEach((t) => {
        plan.push({
          type: "transformation",
          stage: "distributor",
          plugin: t.plugin,
          config: t.config,
          distributorPlugin: d.plugin,
          branchId,
        });
      });
      plan.push({
        type: "distribution",
        stage: "distributor",
        plugin: d.plugin,
        config: d.config,
        branchId,
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
    const content = submission;

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

    if (stepIndex < 0 || stepIndex >= plan.length) {
      throw new ProcessorError(
        "invalid_step_index",
        "Step to tweak is out of bounds of the processing plan.",
      );
    }

    const stepToTweakDetails = plan[stepIndex];
    let partialPlan: ProcessingPlan;

    if (stepToTweakDetails.branchId) {
      partialPlan = plan
        .slice(stepIndex)
        .filter((step) => step.branchId === stepToTweakDetails.branchId);
    } else {
      // Fallback for old plans without branchId
      partialPlan = plan.slice(stepIndex);
    }

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
