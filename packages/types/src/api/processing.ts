import { z } from "zod";
import { PluginSchema } from "./plugins";

// Processing job status
export const ProcessingJobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type ProcessingJobStatus = z.infer<typeof ProcessingJobStatusSchema>;

// Processing step status
export const ProcessingStepStatusSchema = z.enum([
  "pending",
  "processing",
  "success",
  "failed",
]);

export type ProcessingStepStatus = z.infer<typeof ProcessingStepStatusSchema>;

// Processing step type
export const ProcessingStepTypeSchema = z.enum([
  "transformation",
  "distribution",
]);

export type ProcessingStepType = z.infer<typeof ProcessingStepTypeSchema>;

// Processing step stage
export const ProcessingStepStageSchema = z.enum([
  "global",
  "distributor",
  "batch",
]);

export const JobIdParamSchema = z.object({
  jobId: z.string(),
});

export type JobIdParam = z.infer<typeof JobIdParamSchema>;

export type ProcessingStepStage = z.infer<typeof ProcessingStepStageSchema>;

// Processing job
export const ProcessingJobSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  feedId: z.string(),
  status: ProcessingJobStatusSchema,
  idempotencyKey: z.string().optional(),
  retryOfJobId: z.string().nullable().optional(),
  startedAt: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg).toISOString();
      }
      return arg;
    }, z.string())
    .optional(),
  completedAt: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg).toISOString();
      }
      return arg;
    }, z.string())
    .optional(),
  createdAt: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) {
      return new Date(arg).toISOString();
    }
    return arg;
  }, z.string()),
  updatedAt: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg).toISOString();
      }
      return arg;
    }, z.string())
    .optional(),
});

export type ProcessingJob = z.infer<typeof ProcessingJobSchema>;

// Processing step
export const ProcessingStepSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  stepOrder: z.number(),
  type: ProcessingStepTypeSchema,
  stage: ProcessingStepStageSchema,
  plugin: PluginSchema,
  status: ProcessingStepStatusSchema,
  input: z.any().optional(),
  output: z.any().optional(),
  error: z.any().optional(),
  startedAt: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg).toISOString();
      }
      return arg;
    }, z.string())
    .optional(),
  completedAt: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg).toISOString();
      }
      return arg;
    }, z.string())
    .optional(),
  createdAt: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) {
      return new Date(arg).toISOString();
    }
    return arg;
  }, z.string()),
  updatedAt: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg).toISOString();
      }
      return arg;
    }, z.string())
    .optional(),
});

export type ProcessingStep = z.infer<typeof ProcessingStepSchema>;

// API response schemas
export const ProcessingJobsResponseSchema = z.object({
  statusCode: z.number(),
  success: z.boolean(),
  data: z.object({
    jobs: z.array(ProcessingJobSchema),
  }),
});

export type ProcessingJobsResponse = z.infer<
  typeof ProcessingJobsResponseSchema
>;

export const ProcessingStepsResponseSchema = z.object({
  statusCode: z.number(),
  success: z.boolean(),
  data: z.object({
    steps: z.array(ProcessingStepSchema),
  }),
});

export type ProcessingStepsResponse = z.infer<
  typeof ProcessingStepsResponseSchema
>;

export const ProcessingJobRetryResponseSchema = z.object({
  statusCode: z.number(),
  success: z.boolean(),
  data: z.object({
    job: ProcessingJobSchema,
    message: z.string(),
  }),
});

export type ProcessingJobRetryResponse = z.infer<
  typeof ProcessingJobRetryResponseSchema
>;

export const ProcessingStepRetryResponseSchema = z.object({
  statusCode: z.number(),
  success: z.boolean(),
  data: z.object({
    job: ProcessingJobSchema,
    message: z.string(),
  }),
});

export type ProcessingStepRetryResponse = z.infer<
  typeof ProcessingStepRetryResponseSchema
>;
