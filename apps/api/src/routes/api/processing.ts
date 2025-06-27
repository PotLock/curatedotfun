import { createQueue, QUEUE_NAMES } from "@curatedotfun/shared-queue";
import {
  ApiErrorResponseSchema,
  JobIdParamSchema,
  ProcessingJobRetryResponseSchema,
  ProcessingJobsResponseSchema,
  ProcessingStepsResponseSchema,
  SubmissionIdParamSchema,
} from "@curatedotfun/types";
import {
  NotFoundError,
  ProcessorError,
  ServiceError,
} from "@curatedotfun/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { Env } from "../../types/app";
export const processingRoutes = new Hono<Env>();

// Get processing jobs for a submission
processingRoutes.get(
  "/jobs/:submissionId",
  zValidator("param", SubmissionIdParamSchema),
  async (c) => {
    const { submissionId } = c.req.valid("param");
    const feedId = c.req.query("feedId");
    const sp = c.var.sp;
    const db = c.var.db;

    if (!feedId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 400,
          success: false,
          error: { message: "Missing required query parameter: feedId" },
        }),
        400,
      );
    }

    try {
      const processingService = sp.getProcessingService();
      const jobs = await processingService.getJobsBySubmissionAndFeed(
        submissionId,
        feedId,
      );

      return c.json(
        ProcessingJobsResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: { jobs },
        }),
      );
    } catch (error: unknown) {
      sp.getLogger().error(
        { error, submissionId, feedId },
        "Error in processingRoutes.get('/jobs/:submissionId')",
      );

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to fetch processing jobs" },
        }),
        500,
      );
    }
  },
);

// Get processing steps for a job
processingRoutes.get(
  "/jobs/:jobId/steps",
  zValidator("param", JobIdParamSchema),
  async (c) => {
    const { jobId } = c.req.valid("param");
    const sp = c.var.sp;
    const db = c.var.db;

    try {
      const processingService = sp.getProcessingService();
      const steps = await processingService.getStepsByJobId(jobId);

      return c.json(
        ProcessingStepsResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: { steps },
        }),
      );
    } catch (error: unknown) {
      sp.getLogger().error(
        { error, jobId },
        "Error in processingRoutes.get('/jobs/:jobId/steps')",
      );

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to fetch processing steps" },
        }),
        500,
      );
    }
  },
);

// Retry a failed processing job
processingRoutes.post(
  "/jobs/:jobId/retry",
  zValidator("param", JobIdParamSchema),
  async (c) => {
    const { jobId } = c.req.valid("param");
    const sp = c.var.sp;

    try {
      const processingService = sp.getProcessingService();
      const submissionService = sp.getSubmissionService();
      const feedService = sp.getFeedService();

      const originalJob = await processingService.getJobById(jobId);
      if (!originalJob) {
        throw new NotFoundError("ProcessingJob", jobId);
      }

      if (originalJob.status !== "failed") {
        throw new ProcessorError(
          "job_not_failed",
          "Only failed jobs can be retried.",
        );
      }

      const submission = await submissionService.getSubmission(
        originalJob.submissionId,
      );
      if (!submission) {
        throw new NotFoundError("Submission", originalJob.submissionId);
      }

      const feed = await feedService.getFeedById(originalJob.feedId);
      if (!feed || !feed.config) {
        throw new NotFoundError("Feed or FeedConfig", originalJob.feedId);
      }

      const processingQueue = createQueue(QUEUE_NAMES.SUBMISSION_PROCESSING);
      const newQueueJob = await processingQueue.add(
        QUEUE_NAMES.SUBMISSION_PROCESSING,
        {
          submissionId: originalJob.submissionId,
          feedId: originalJob.feedId,
          retryOfJobId: jobId,
        },
      );

      if (!newQueueJob || !newQueueJob.id) {
        throw new ProcessorError(
          "queue_error",
          "Failed to create new job in queue.",
        );
      }

      return c.json(
        ProcessingJobRetryResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: {
            job: originalJob, // Returning original job, UI should refetch.
            message: "Processing job retry initiated successfully",
          },
        }),
      );
    } catch (error: unknown) {
      sp.getLogger().error(
        { error, jobId },
        "Error in processingRoutes.post('/jobs/:jobId/retry')",
      );

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to retry processing job" },
        }),
        500,
      );
    }
  },
);

// Define step ID param schema
const StepIdParamSchema = z.object({
  stepId: z.string(),
});

// Retry processing from a specific failed step
processingRoutes.post(
  "/steps/:stepId/retry",
  zValidator("param", StepIdParamSchema),
  async (c) => {
    const { stepId } = c.req.valid("param");
    const sp = c.var.sp;

    try {
      const processingService = sp.getProcessingService();
      const feedService = sp.getFeedService();

      // We need to get the job from the step to find the feed
      const step = await processingService.getStepById(stepId);
      if (!step) {
        throw new NotFoundError("ProcessingStep", stepId);
      }
      const job = await processingService.getJobById(step.jobId);
      if (!job) {
        throw new NotFoundError("ProcessingJob", step.jobId);
      }

      const feed = await feedService.getFeedById(job.feedId);
      if (!feed || !feed.config?.outputs?.stream) {
        throw new NotFoundError("Feed or FeedConfig", job.feedId);
      }

      // Retry from the specific step
      const newJob = await processingService.retryStep(
        stepId,
        feed as any, // Cast to avoid type issues with config structure
      );

      return c.json(
        ProcessingJobRetryResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: {
            job: newJob,
            message: "Processing step retry initiated successfully",
          },
        }),
      );
    } catch (error: unknown) {
      sp.getLogger().error(
        { error, stepId },
        "Error in processingRoutes.post('/steps/:stepId/retry')",
      );

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to retry processing step" },
        }),
        500,
      );
    }
  },
);
