import { relations, sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable as table,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { Json } from "../types";
import { timestamps } from "./common";
import { feeds } from "./feeds";
import { submissions } from "./submissions";

/**
 * Schema and type for error information in a processing step.
 * This provides a structured way to store error details.
 */
export const StepErrorSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  stepName: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  pluginErrorCode: z.string().optional(),
  retryable: z.boolean().optional(),
});

export type StepError = z.infer<typeof StepErrorSchema>;

/**
 * Result of a distribution operation.
 * This provides a standardized structure for distribution results.
 */
export const DistributionResultSchema = z.object({
  success: z.boolean(),
  details: z.record(z.unknown()).optional(),
});

export type DistributionResult = z.infer<typeof DistributionResultSchema>;

/**
 * Schema for a single step within a ProcessingPlan.
 */
export const ProcessingPlanStepSchema = z.object({
  type: z.enum(["transformation", "distribution"]),
  stage: z.enum(["global", "distributor"]),
  plugin: z.string(),
  config: z.record(z.unknown()).optional(),
  // For distributor transforms, this links back to the parent distributor plugin
  distributorPlugin: z.string().optional(),
});
export type ProcessingPlanStep = z.infer<typeof ProcessingPlanStepSchema>;

/**
 * Schema for the entire ProcessingPlan.
 */
export const ProcessingPlanSchema = z.array(ProcessingPlanStepSchema);
export type ProcessingPlan = z.infer<typeof ProcessingPlanSchema>;

// Processing job status enum
export const processingJobStatusValues = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export const processingJobStatusEnum = pgEnum(
  "processing_job_status",
  processingJobStatusValues,
);
export const processingJobStatusZodEnum = z.enum(processingJobStatusValues);
export type ProcessingJobStatus = (typeof processingJobStatusValues)[number];

export const processingStepStatusValues = [
  "pending",
  "processing",
  "success",
  "failed",
] as const;
export const processingStepStatusEnum = pgEnum(
  "processing_step_status",
  processingStepStatusValues,
);
export const processingStepStatusZodEnum = z.enum(processingStepStatusValues);
export type ProcessingStepStatus = (typeof processingStepStatusValues)[number];

export const processingStepTypeValues = [
  "transformation",
  "distribution",
] as const;
export const processingStepTypeEnum = pgEnum(
  "processing_step_type",
  processingStepTypeValues,
);
export const processingStepTypeZodEnum = z.enum(processingStepTypeValues);
export type ProcessingStepType = (typeof processingStepTypeValues)[number];

// Processing step stage enum
export const processingStepStageValues = [
  "global",
  "distributor",
  "batch",
] as const;
export const processingStepStageEnum = pgEnum(
  "processing_step_stage",
  processingStepStageValues,
);
export const processingStepStageZodEnum = z.enum(processingStepStageValues);
export type ProcessingStepStage = (typeof processingStepStageValues)[number];

export const processingJobs = table(
  "processing_jobs",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").unique(),
    plan: jsonb("plan").$type<ProcessingPlan>(),
    status: processingJobStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    retryOfJobId: text("retry_of_job_id"),
    ...timestamps,
  },
  (table) => [
    index("processing_jobs_submission_feed_idx").on(
      table.submissionId,
      table.feedId,
    ),
    index("processing_jobs_status_idx").on(table.status),
    index("processing_jobs_started_at_idx").on(table.startedAt),
    foreignKey({
      columns: [table.retryOfJobId],
      foreignColumns: [table.id],
      name: "processing_jobs_retry_of_job_id_fkey",
    }),
    index("processing_jobs_retry_check")
      .on(table.id, table.retryOfJobId)
      .where(sql`id != retry_of_job_id OR retry_of_job_id IS NULL`),
  ],
);

// Processing steps table
export const processingSteps = table(
  "processing_steps",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => processingJobs.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    type: processingStepTypeEnum("type").notNull(),
    stage: processingStepStageEnum("stage").notNull(),
    pluginName: text("plugin_name"),
    stepName: text("step_name"),
    config: jsonb("config").$type<Json>(),
    status: processingStepStatusEnum("status").notNull().default("pending"),
    input: jsonb("input").$type<Json>(),
    output: jsonb("output").$type<Json>(),
    error: jsonb("error").$type<Json>(),
    version: integer("version").notNull().default(1),
    startedAt: timestamp("started_at", {
      mode: "date",
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    ...timestamps,
  },
  (table) => [
    index("processing_steps_job_idx").on(table.jobId),
    index("processing_steps_plugin_name_idx").on(table.pluginName),
    index("processing_steps_status_idx").on(table.status),
    uniqueIndex("processing_steps_job_order_idx").on(
      table.jobId,
      table.stepOrder,
    ),
  ],
);

// Relations
export const processingJobsRelations = relations(
  processingJobs,
  ({ one, many }) => {
    return {
      submission: one(submissions, {
        fields: [processingJobs.submissionId],
        references: [submissions.tweetId],
        relationName: "ProcessingJobSubmission",
      }),
      feed: one(feeds, {
        fields: [processingJobs.feedId],
        references: [feeds.id],
        relationName: "ProcessingJobFeed",
      }),
      retryOf: one(processingJobs, {
        fields: [processingJobs.retryOfJobId],
        references: [processingJobs.id],
        relationName: "ProcessingJobRetry",
      }),
      steps: many(processingSteps, {
        relationName: "ProcessingJobSteps",
      }),
    };
  },
);

export const processingStepsRelations = relations(
  processingSteps,
  ({ one }) => {
    return {
      job: one(processingJobs, {
        fields: [processingSteps.jobId],
        references: [processingJobs.id],
        relationName: "ProcessingStepJob",
      }),
    };
  },
);

export const insertProcessingJobSchema = createInsertSchema(processingJobs, {
  id: z.string().uuid(),
  submissionId: z.string(),
  feedId: z.string(),
  plan: ProcessingPlanSchema.optional(),
  idempotencyKey: z.string().optional(),
  status: processingJobStatusZodEnum.optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  retryOfJobId: z.string().optional(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const updateProcessingJobSchema = createUpdateSchema(processingJobs, {
  status: processingJobStatusZodEnum.optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export const selectProcessingJobSchema = createSelectSchema(processingJobs);

export const insertProcessingStepSchema = createInsertSchema(processingSteps, {
  id: z.string().uuid(),
  jobId: z.string(),
  stepOrder: z.number().int().positive(),
  type: processingStepTypeZodEnum,
  stage: processingStepStageZodEnum,
  pluginName: z.string().optional().nullable(),
  stepName: z.string().optional().nullable(),
  config: z.custom<Json>().optional().nullable(),
  status: processingStepStatusZodEnum.optional(),
  input: z.custom<Json>().optional(),
  output: z.custom<Json>().optional(),
  error: z.custom<Json>().optional(),
  version: z.number().int().positive().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const updateProcessingStepSchema = createUpdateSchema(processingSteps, {
  status: processingStepStatusZodEnum.optional(),
  output: z.custom<Json>().optional(),
  error: z.custom<Json>().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export const selectProcessingStepSchema = createSelectSchema(processingSteps);

// Type exports
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type UpdateProcessingJob = z.infer<typeof updateProcessingJobSchema>;
export type SelectProcessingJob = z.infer<typeof selectProcessingJobSchema>;

export type InsertProcessingStep = z.infer<typeof insertProcessingStepSchema>;
export type UpdateProcessingStep = z.infer<typeof updateProcessingStepSchema>;
export type SelectProcessingStep = z.infer<typeof selectProcessingStepSchema>;
