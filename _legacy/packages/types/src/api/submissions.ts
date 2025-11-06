import { z } from "zod";
import { ModerationActionSchema } from "./moderation";

export const SubmissionStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SubmissionFeedSchema = z.object({
  submissionId: z.string(),
  feedId: z.string(),
  status: SubmissionStatusSchema,
  createdAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  updatedAt: z
    .preprocess(
      (arg) => (arg instanceof Date ? arg.toISOString() : arg),
      z.string().datetime(),
    )
    .nullable(),
});
export type SubmissionFeed = z.infer<typeof SubmissionFeedSchema>;

export const BaseSubmissionSchema = z.object({
  tweetId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  createdAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  updatedAt: z
    .preprocess(
      (arg) => (arg instanceof Date ? arg.toISOString() : arg),
      z.string().datetime(),
    )
    .nullable(),
});
export type BaseSubmission = z.infer<typeof BaseSubmissionSchema>;

export const SubmissionSchema = BaseSubmissionSchema.extend({
  curatorId: z.string(),
  curatorUsername: z.string(),
  curatorNotes: z.string().nullable(),
  curatorTweetId: z.string(),
  submittedAt: z
    .preprocess(
      (arg) => (arg instanceof Date ? arg.toISOString() : arg),
      z.string().datetime(),
    )
    .nullable(),
  moderationHistory: z.array(ModerationActionSchema),
  feeds: z.array(SubmissionFeedSchema),
  status: SubmissionStatusSchema.optional(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const FeedContextSubmissionSchema = SubmissionSchema.omit({
  feeds: true,
}).extend({
  status: SubmissionStatusSchema,
});
export type FeedContextSubmission = z.infer<typeof FeedContextSubmissionSchema>;
