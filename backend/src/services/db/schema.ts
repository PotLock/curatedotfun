import {
  index,
  integer,
  primaryKey,
  sqliteTable as table,
  text,
} from "drizzle-orm/sqlite-core";

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
    id: text("id").primaryKey(), // Platform-specific ID
    data: text("data").notNull(), // JSON containing content data
    metadata: text("metadata").notNull(), // JSON containing submission metadata
    submittedAt: text("submitted_at"),
    ...timestamps,
  },
  (submissions) => [
    index("submissions_submitted_at_idx").on(submissions.submittedAt),
  ],
);

export const submissionFeeds = table(
  "submission_feeds",
  {
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    status: text("status")
      .notNull()
      .$type<SubmissionStatus>()
      .default(SubmissionStatus.PENDING),
    metadata: text("metadata"), // JSON containing moderation data
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
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    metadata: text("metadata"), // JSON containing moderation details
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("moderation_history_submission_idx").on(table.submissionId),
    index("moderation_history_feed_idx").on(table.feedId),
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
