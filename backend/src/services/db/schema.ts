import {
  index,
  integer,
  primaryKey,
  pgTable as table,
  text,
  timestamp,
  serial,
  date,
  jsonb,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

import { FeedConfig } from "../../types/config";
import { RecapState } from "../../types/recap";

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
};

export const SubmissionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

// Feeds Table
// Stores the entire feed configuration as JSONB
export const feeds = table("feeds", {
  id: text("id").primaryKey(), // (hashtag)
  // Store the entire configuration as JSONB
  config: jsonb("config").$type<FeedConfig>().notNull(),
  // Keep these fields for backward compatibility and quick lookups
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

// Feed Recaps State Table
// Tracks the state of each recap job
export const feedRecapsState = table(
  "feed_recaps_state",
  {
    id: serial("id").primaryKey(),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    // Unique ID of the recap configuration
    recapId: text("recap_id").notNull(),
    // Unique ID provided by the external scheduler service for this specific job
    externalJobId: text("external_job_id").unique(),
    // Last time the curate backend successfully processed this recap
    lastSuccessfulCompletion: timestamp("last_successful_completion"),
    // Error message if the last run failed in the curate backend
    lastRunError: text("last_run_error"),
    ...timestamps,
  },
  (table) => ({
    // Ensure only one state record per feed/recap ID combination
    feedRecapIdIdx: uniqueIndex("feed_recap_id_idx").on(
      table.feedId,
      table.recapId,
    ),
  }),
);

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
    submittedAt: text("submitted_at"),
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
    status: text("status")
      .notNull()
      .$type<SubmissionStatus>()
      .default(SubmissionStatus.PENDING),
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

export const feedPlugins = table(
  "feed_plugins",
  {
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    pluginId: text("plugin_id").notNull(),
    config: text("config").notNull(), // JSON string of plugin-specific config
    ...timestamps,
  },
  (table) => [
    index("feed_plugins_feed_idx").on(table.feedId),
    index("feed_plugins_plugin_idx").on(table.pluginId),
    primaryKey({ columns: [table.feedId, table.pluginId] }), // Ensure one config per plugin per feed
  ],
);

// will not be needed after Masa
export const twitterCookies = table("twitter_cookies", {
  username: text("username").primaryKey(),
  cookies: text("cookies").notNull(), // JSON string of TwitterCookie[]
  ...timestamps,
});

// done differently after Masa
export const twitterCache = table("twitter_cache", {
  key: text("key").primaryKey(), // e.g., "last_tweet_id"
  value: text("value").notNull(),
  ...timestamps,
});
