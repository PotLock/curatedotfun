import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  serial,
  pgTable as table,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { feeds, submissions, users } from "../schema";
import { Metadata, timestamps } from "./common";

// Activity Types
export const ActivityType = {
  CONTENT_SUBMISSION: "CONTENT_SUBMISSION",
  CONTENT_APPROVAL: "CONTENT_APPROVAL",
  TOKEN_BUY: "TOKEN_BUY",
  TOKEN_SELL: "TOKEN_SELL",
  POINTS_REDEMPTION: "POINTS_REDEMPTION",
  POINTS_AWARDED: "POINTS_AWARDED",
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const activities = table(
  "activities",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<ActivityType>(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    feed_id: text("feed_id").references(() => feeds.id, {
      onDelete: "set null",
    }),
    submission_id: text("submission_id").references(() => submissions.tweetId, {
      onDelete: "set null",
    }),

    // Dynamic activity-specific data and metadata
    data: jsonb("data"), // Holds the actual activity data
    metadata: jsonb("metadata").$type<Metadata>(),

    ...timestamps,
  },
  (activities) => [
    // Indexes for common queries
    index("activities_user_id_idx").on(activities.user_id),
    index("activities_type_idx").on(activities.type),
    index("activities_timestamp_idx").on(activities.timestamp),
    index("activities_feed_id_idx").on(activities.feed_id),
    index("activities_submission_id_idx").on(
      activities.submission_id,
    ),
    // Index on metadata type for efficient queries
    index("activities_metadata_type_idx").on(
      sql`(${activities.metadata} ->> 'type')`,
    ),
  ],
);

// User Stats Table - For aggregated user statistics
export const userStats = table("user_stats", {
  user_id: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  total_submissions: integer("total_submissions").notNull().default(0),
  total_approvals: integer("total_approvals").notNull().default(0),
  total_points: integer("total_points").notNull().default(0),

  // Dynamic stats data and metadata
  data: jsonb("data"), // Holds additional stats data
  metadata: jsonb("metadata").$type<Metadata>(),

  ...timestamps,
});

// Feed User Stats Table - For feed-specific user statistics
export const feedUserStats = table(
  "feed_user_stats",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feed_id: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    submissions_count: integer("submissions_count").notNull().default(0),
    approvals_count: integer("approvals_count").notNull().default(0),
    points: integer("points").notNull().default(0),
    curator_rank: integer("curator_rank"),
    approver_rank: integer("approver_rank"),

    // Dynamic feed-specific stats data and metadata
    data: jsonb("data"), // Holds additional stats data
    metadata: jsonb("metadata").$type<Metadata>(),

    ...timestamps,
  },
  (feedUserStats) => [
    // Ensure one stats record per user/feed combination
    index("feed_user_stats_user_feed_idx").on(
      feedUserStats.user_id,
      feedUserStats.feed_id,
    ),
    // Indexes for ranking queries
    index("feed_user_stats_curator_rank_idx").on(
      feedUserStats.feed_id,
      feedUserStats.curator_rank,
    ),
    index("feed_user_stats_approver_rank_idx").on(
      feedUserStats.feed_id,
      feedUserStats.approver_rank,
    ),
  ],
);
