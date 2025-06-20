import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  serial,
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
import { Metadata, timestamps } from "./common";
import { feeds } from "./feeds";
import { submissions } from "./submissions";
import { users } from "./users";

export const activityTypeValues = [
  "CONTENT_SUBMISSION",
  "CONTENT_APPROVAL",
  "CONTENT_REJECTION",
  "TOKEN_BUY",
  "TOKEN_SELL",
  "POINTS_REDEMPTION",
  "POINTS_AWARDED",
] as const; // source of truth
export const activityTypeEnum = pgEnum("activity_type", activityTypeValues); // for db type safety
export const activityTypeZodEnum = z.enum(activityTypeValues); // for runtime validation and type inference
export type ActivityType = (typeof activityTypeValues)[number]; // for type validation

// Activities Table
export const activities = table(
  "activities",
  {
    id: serial("id").primaryKey(),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    timestamp: timestamp("timestamp", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    feed_id: text("feed_id").references(() => feeds.id, {
      onDelete: "set null",
    }),
    submission_id: text("submission_id").references(() => submissions.tweetId, {
      onDelete: "set null",
    }),

    // Dynamic activity-specific data and metadata
    data: jsonb("data"), // Holds the actual activity data
    metadata: jsonb("metadata").$type<Metadata>(), // Holds type (schema URL) and other meta info

    ...timestamps,
  },
  (activities) => [
    index("activities_user_id_idx").on(activities.user_id),
    index("activities_type_idx").on(activities.type),
    index("activities_timestamp_idx").on(activities.timestamp),
    index("activities_feed_id_idx").on(activities.feed_id),
    index("activities_submission_id_idx").on(activities.submission_id),
    index("activities_metadata_type_idx").on(
      sql`(${activities.metadata} ->> 'type')`,
    ),
  ],
);

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.user_id],
    references: [users.id],
  }),
  feed: one(feeds, {
    fields: [activities.feed_id],
    references: [feeds.id],
  }),
  submission: one(submissions, {
    fields: [activities.submission_id],
    references: [submissions.tweetId],
  }),
}));

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
  metadata: jsonb("metadata").$type<Metadata>(), // Holds type (schema URL) and other meta info

  ...timestamps,
});

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.user_id],
    references: [users.id],
  }),
}));

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
    metadata: jsonb("metadata").$type<Metadata>(), // Holds type (schema URL) and other meta info

    ...timestamps,
  },
  (feedUserStats) => [
    // Ensure one stats record per user/feed combination
    index("feed_user_stats_user_feed_idx").on(
      feedUserStats.user_id,
      feedUserStats.feed_id,
    ),
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

export const feedUserStatsRelations = relations(feedUserStats, ({ one }) => ({
  user: one(users, {
    fields: [feedUserStats.user_id],
    references: [users.id],
  }),
  feed: one(feeds, {
    fields: [feedUserStats.feed_id],
    references: [feeds.id],
  }),
}));

export const insertActivitySchema = createInsertSchema(activities, {
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateActivitySchema = createUpdateSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>;
export type SelectActivity = z.infer<typeof selectActivitySchema>;

// UserStats Schemas and Types
export const insertUserStatsSchema = createInsertSchema(userStats, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateUserStatsSchema = createUpdateSchema(userStats);
export const selectUserStatsSchema = createSelectSchema(userStats);
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UpdateUserStats = z.infer<typeof updateUserStatsSchema>;
export type SelectUserStats = z.infer<typeof selectUserStatsSchema>;

// FeedUserStats Schemas and Types
export const insertFeedUserStatsSchema = createInsertSchema(feedUserStats, {
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateFeedUserStatsSchema = createUpdateSchema(feedUserStats);
export const selectFeedUserStatsSchema = createSelectSchema(feedUserStats);
export type InsertFeedUserStats = z.infer<typeof insertFeedUserStatsSchema>;
export type UpdateFeedUserStats = z.infer<typeof updateFeedUserStatsSchema>;
export type SelectFeedUserStats = z.infer<typeof selectFeedUserStatsSchema>;
