import {
  index,
  integer,
  primaryKey,
  pgTable as table,
  text,
  timestamp,
  serial,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// From exports/plugins
export * from "../twitter/schema";

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

// Users Table (for Web3Auth/NEAR integration)
export const users = table(
  "users",
  {
    id: serial("id").primaryKey(),
    sub_id: text("sub_id").notNull().unique(), // Unique subject identifier from Web3Auth
    near_account_id: text("near_account_id").unique(), // e.g., chosenname.users.curatedotfun.near
    near_public_key: text("near_public_key").notNull().unique(), // ed25519 public key
    username: text("username"), // Optional: display name
    email: text("email"), // Optional: email from Web3Auth
    ...timestamps, // createdAt, updatedAt
  },
  (users) => ({
    subIdIdx: uniqueIndex("users_sub_id_idx").on(users.sub_id),
    nearAccountIdIdx: uniqueIndex("users_near_account_id_idx").on(
      users.near_account_id,
    ),
    nearPublicKeyIdx: uniqueIndex("users_near_public_key_idx").on(
      users.near_public_key,
    ),
  }),
);
