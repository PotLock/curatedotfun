import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgEnum,
  primaryKey,
  pgTable as table,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

import { timestamps } from "./common";
import { feeds } from "./feeds";
import { moderationHistory, SelectModerationHistory } from "./moderation";
import { processingJobs } from "./processing";

export const submissionStatusValues = [
  "pending",
  "approved",
  "rejected",
] as const; // source of truth
export const submissionStatusEnum = pgEnum(
  "submission_status",
  submissionStatusValues,
); // for db type safety
export const submissionStatusZodEnum = z.enum(submissionStatusValues); // for runtime validation and type inference
export type SubmissionStatus = (typeof submissionStatusValues)[number]; // for static type checking

export const submissions = table(
  "submissions",
  {
    tweetId: text("tweet_id").primaryKey(),
    userId: text("user_id").notNull(), // Original tweet author
    username: text("username").notNull(), // Original tweet author
    curatorId: text("curator_id").notNull(), // Who submitted it
    curatorUsername: text("curator_username").notNull(),
    curatorTweetId: text("curator_tweet_id").notNull(), // The tweet where they submitted it
    content: text("content").notNull(), // Original tweet content
    curatorNotes: text("curator_notes"),
    submittedAt: timestamp("submitted_at", {
      mode: "date",
      withTimezone: true,
    }),
    ...timestamps,
  },
  (submissions) => [
    index("submissions_user_id_idx").on(submissions.userId),
    index("submissions_submitted_at_idx").on(submissions.submittedAt),
  ],
);

export const submissionFeeds = table(
  "submission_feeds",
  {
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.feedId] }),
    index("submission_feeds_feed_idx").on(table.feedId),
  ],
);

export const submissionCounts = table(
  "submission_counts",
  {
    userId: text("user_id").primaryKey(),
    count: integer("count").notNull().default(0),
    lastResetDate: date("last_reset_date").notNull(),
    ...timestamps,
  },
  (table) => [index("submission_counts_date_idx").on(table.lastResetDate)],
);

export const submissionsRelations = relations(submissions, ({ many }) => ({
  moderationHistoryItems: many(moderationHistory, {
    relationName: "SubmissionModerationHistory",
  }),
  feedLinks: many(submissionFeeds, {
    relationName: "SubmissionFeedLinks",
  }),
  processingJobs: many(processingJobs, {
    relationName: "SubmissionProcessingJobs",
  }),
}));

export const submissionFeedsRelations = relations(
  submissionFeeds,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionFeeds.submissionId],
      references: [submissions.tweetId],
      relationName: "SubmissionFeedLinks",
    }),
    feed: one(feeds, {
      fields: [submissionFeeds.feedId],
      references: [feeds.id],
      relationName: "FeedSubmissionLinks",
    }),
  }),
);

// Submission Schemas and Types
export const insertSubmissionSchema = createInsertSchema(submissions, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateSubmissionSchema = createUpdateSchema(submissions);
export const selectSubmissionSchema = createSelectSchema(submissions, {
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type UpdateSubmission = z.infer<typeof updateSubmissionSchema>;
export type SelectSubmission = z.infer<typeof selectSubmissionSchema>;

// SubmissionFeed Schemas and Types
export const insertSubmissionFeedSchema = createInsertSchema(submissionFeeds, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateSubmissionFeedSchema = createUpdateSchema(submissionFeeds);
export const selectSubmissionFeedSchema = createSelectSchema(submissionFeeds);
export type InsertSubmissionFeed = z.infer<typeof insertSubmissionFeedSchema>;
export type UpdateSubmissionFeed = z.infer<typeof updateSubmissionFeedSchema>;
export type SelectSubmissionFeed = z.infer<typeof selectSubmissionFeedSchema>;

export const RichSubmissionSchema = selectSubmissionSchema.extend({
  feeds: z.array(selectSubmissionFeedSchema),
});

export type RichSubmission = SelectSubmission & {
  feeds: SelectSubmissionFeed[];
  moderationHistory: SelectModerationHistory[];
};

// SubmissionCounts Schemas and Types
export const insertSubmissionCountSchema = createInsertSchema(
  submissionCounts,
  {
    createdAt: z.undefined(),
    updatedAt: z.undefined(),
  },
);
export const updateSubmissionCountSchema = createUpdateSchema(submissionCounts);
export const selectSubmissionCountSchema = createSelectSchema(submissionCounts);
export type InsertSubmissionCount = z.infer<typeof insertSubmissionCountSchema>;
export type UpdateSubmissionCount = z.infer<typeof updateSubmissionCountSchema>;
export type SelectSubmissionCount = z.infer<typeof selectSubmissionCountSchema>;
