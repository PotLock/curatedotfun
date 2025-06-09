import {
  date,
  index,
  integer,
  pgEnum,
  primaryKey,
  serial,
  pgTable as table,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

import { feeds } from "./feeds";
import { timestamps } from "./common";

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
    submittedAt: timestamp("submitted_at"),
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
    moderationResponseTweetId: text("moderation_response_tweet_id"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.feedId] }),
    index("submission_feeds_feed_idx").on(table.feedId),
  ],
);

export const moderationHistory = table(
  "moderation_history",
  {
    id: serial("id").primaryKey(),
    tweetId: text("tweet_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    moderationTweetId: text("moderation_tweet_id"),
    ...timestamps,
  },
  (table) => [
    index("moderation_history_tweet_idx").on(table.tweetId),
    index("moderation_history_admin_idx").on(table.adminId),
    index("moderation_history_feed_idx").on(table.feedId),
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
}));

export const moderationHistoryRelations = relations(
  moderationHistory,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [moderationHistory.tweetId],
      references: [submissions.tweetId],
      relationName: "SubmissionModerationHistory",
    }),
    feed: one(feeds, {
      fields: [moderationHistory.feedId],
      references: [feeds.id],
      relationName: "ModerationHistoryFeedReference",
    }),
  }),
);

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
