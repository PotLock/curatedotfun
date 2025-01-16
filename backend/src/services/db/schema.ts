import {
  index,
  integer,
  primaryKey,
  sqliteTable as table,
  text,
} from "drizzle-orm/sqlite-core";

// From exports/plugins
export * from "../twitter/schema";
export * from "../rss/schema";

// Reusable timestamp columns
const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
};

export const SubmissionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

// Feeds Table
// Builds according to feeds in curate.config.json
export const feeds = table("feeds", {
  id: text("id").primaryKey(), // (hashtag)
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const submissions = table(
  "submissions",
  {
    tweetId: text("tweet_id").primaryKey(),
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    content: text("content").notNull(),
    description: text("description"),
    status: text("status")
      .notNull()
      .$type<SubmissionStatus>()
      .default(SubmissionStatus.PENDING),
    acknowledgmentTweetId: text("acknowledgment_tweet_id").unique(),
    moderationResponseTweetId: text("moderation_response_tweet_id"),
    submittedAt: text("submitted_at"),
    ...timestamps,
  },
  (submissions) => [
    index("submissions_user_id_idx").on(submissions.userId),
    index("submissions_status_idx").on(submissions.status),
    index("submissions_acknowledgment_idx").on(
      submissions.acknowledgmentTweetId,
    ),
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
    id: integer("id").primaryKey({ autoIncrement: true }),
    tweetId: text("tweet_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("moderation_history_tweet_idx").on(table.tweetId),
    index("moderation_history_admin_idx").on(table.adminId),
  ],
);

export const submissionCounts = table(
  "submission_counts",
  {
    userId: text("user_id").primaryKey(),
    count: integer("count").notNull().default(0),
    lastResetDate: text("last_reset_date").notNull(),
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
