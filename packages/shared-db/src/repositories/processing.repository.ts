import { and, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import {
  InsertProcessingJob,
  InsertProcessingStep,
  SelectProcessingJob,
  SelectProcessingStep,
  UpdateProcessingJob,
  UpdateProcessingStep,
  processingJobs,
  processingSteps,
} from "../schema/processing";
import type { DB, Json } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

export class ProcessingRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Create a new processing job
   * @param data The job data to insert
   * @returns The created job
   */
  async createJob(
    data: Omit<InsertProcessingJob, "id">,
    txDb?: DB,
  ): Promise<SelectProcessingJob> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const id = crypto.randomUUID();
          const [job] = await dbInstance
            .insert(processingJobs)
            .values({ ...data, id })
            .returning();

          if (!job) {
            throw new Error("Failed to insert processing job into database");
          }

          return job;
        }, dbToUse);
      },
      {
        operationName: "create processing job",
        additionalContext: { data },
      },
    );
  }

  /**
   * Get a processing job by ID
   * @param id The job ID
   * @returns The job if found, null otherwise
   */
  async getJobById(id: string): Promise<SelectProcessingJob | null> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(processingJobs)
            .where(eq(processingJobs.id, id))
            .limit(1);

          return result[0] || null;
        }, this.db);
      },
      {
        operationName: "get processing job by ID",
        additionalContext: { id },
      },
      null,
    );
  }

  /**
   * Get all processing jobs for a submission in a feed
   * @param submissionId The submission ID
   * @param feedId The feed ID
   * @returns Array of processing jobs
   */
  async getJobsBySubmissionAndFeed(
    submissionId: string,
    feedId: string,
  ): Promise<SelectProcessingJob[]> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          return dbInstance
            .select()
            .from(processingJobs)
            .where(
              and(
                eq(processingJobs.submissionId, submissionId),
                eq(processingJobs.feedId, feedId),
              ),
            )
            .orderBy(processingJobs.createdAt);
        }, this.db);
      },
      {
        operationName: "get processing jobs by submission and feed",
        additionalContext: { submissionId, feedId },
      },
      [],
    );
  }

  /**
   * Update a processing job
   * @param id The job ID
   * @param data The data to update
   * @returns The updated job
   */
  async updateJob(
    id: string,
    data: UpdateProcessingJob,
    txDb?: DB,
  ): Promise<SelectProcessingJob> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const [job] = await dbInstance
            .update(processingJobs)
            .set({
              ...data,
              updatedAt: sql`NOW()`,
            })
            .where(eq(processingJobs.id, id))
            .returning();

          if (!job) {
            throw new Error(`Processing job not found: ${id}`);
          }

          return job;
        }, dbToUse);
      },
      {
        operationName: "update processing job",
        additionalContext: { id, data },
      },
    );
  }

  /**
   * Create a new processing step
   * @param data The step data to insert
   * @param txDb Optional transaction DB instance
   * @returns The created step
   */
  async createStep(
    data: Omit<
      InsertProcessingStep,
      "id" | "input" | "output" | "error" | "config"
    > & {
      input?: Json;
      output?: Json;
      error?: Json;
      config?: Json;
    },
    txDb?: DB,
  ): Promise<SelectProcessingStep> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const id = crypto.randomUUID();
          const [step] = await dbInstance
            .insert(processingSteps)
            .values({ ...data, id })
            .returning();

          if (!step) {
            throw new Error("Failed to insert processing step into database");
          }

          return step;
        }, dbToUse);
      },
      {
        operationName: "create processing step",
        additionalContext: { data },
      },
    );
  }

  /**
   * Get all steps for a processing job
   * @param jobId The job ID
   * @returns Array of processing steps
   */
  async getStepsByJobId(jobId: string): Promise<SelectProcessingStep[]> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          return dbInstance
            .select()
            .from(processingSteps)
            .where(eq(processingSteps.jobId, jobId))
            .orderBy(processingSteps.stepOrder);
        }, this.db);
      },
      {
        operationName: "get processing steps by job ID",
        additionalContext: { jobId },
      },
      [],
    );
  }

  /**
   * Get a processing step by ID
   * @param id The step ID
   * @returns The step if found, null otherwise
   */
  async getStepById(id: string): Promise<SelectProcessingStep | null> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(processingSteps)
            .where(eq(processingSteps.id, id))
            .limit(1);

          return result[0] || null;
        }, this.db);
      },
      {
        operationName: "get processing step by ID",
        additionalContext: { id },
      },
      null,
    );
  }

  /**
   * Update a processing step
   * @param id The step ID
   * @param data The data to update
   * @returns The updated step
   */
  async updateStep(
    id: string,
    data: Omit<
      UpdateProcessingStep,
      "input" | "output" | "error" | "config"
    > & {
      input?: Json;
      output?: Json;
      error?: Json;
      config?: Json;
    },
    txDb?: DB,
  ): Promise<SelectProcessingStep> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const [step] = await dbInstance
            .update(processingSteps)
            .set({
              ...data,
              updatedAt: sql`NOW()`,
            })
            .where(eq(processingSteps.id, id))
            .returning();

          if (!step) {
            throw new Error(`Processing step not found: ${id}`);
          }

          return step;
        }, dbToUse);
      },
      {
        operationName: "update processing step",
        additionalContext: { id, data },
      },
    );
  }

  /**
   * Create a job with steps in a single transaction
   * @param jobData The job data
   * @param stepsData Array of step data
   * @returns The created job and steps
   */
  async createJobWithSteps(
    jobData: Omit<InsertProcessingJob, "id">,
    stepsData: Omit<InsertProcessingStep, "id" | "jobId">[],
  ): Promise<{ job: SelectProcessingJob; steps: SelectProcessingStep[] }> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          return dbInstance.transaction(async (tx) => {
            // Create the job
            const jobId = crypto.randomUUID();
            const [job] = await tx
              .insert(processingJobs)
              .values({ ...jobData, id: jobId })
              .returning();

            if (!job) {
              throw new Error("Failed to insert processing job into database");
            }

            // Create all steps
            const steps = await Promise.all(
              stepsData.map(async (stepData, index) => {
                const stepId = crypto.randomUUID();
                const [step] = await tx
                  .insert(processingSteps)
                  .values({
                    ...stepData,
                    id: stepId,
                    jobId,
                    stepOrder: index + 1,
                  })
                  .returning();

                if (!step) {
                  throw new Error(
                    `Failed to insert processing step ${index + 1}`,
                  );
                }

                return step;
              }),
            );

            return { job, steps };
          });
        }, this.db);
      },
      {
        operationName: "create processing job with steps",
        additionalContext: { jobData, stepsCount: stepsData.length },
      },
    );
  }
}
