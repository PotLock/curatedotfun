import { activities, activityTypeValues, feedUserStats, userStats } from "@curatedotfun/shared-db";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

// Activity schemas
export const insertActivitySchema = createInsertSchema(activities, {
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
  timestamp: z.undefined(),
});

export const selectActivitySchema = createSelectSchema(activities);

export const updateActivitySchema = createUpdateSchema(activities, {
  id: z.undefined(),
  user_id: z.undefined(),
  type: z.undefined(),
  timestamp: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

// User Stats schemas
export const insertUserStatsSchema = createInsertSchema(userStats, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const selectUserStatsSchema = createSelectSchema(userStats);

export const updateUserStatsSchema = createUpdateSchema(userStats, {
  user_id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

// Feed User Stats schemas
export const insertFeedUserStatsSchema = createInsertSchema(feedUserStats, {
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const selectFeedUserStatsSchema = createSelectSchema(feedUserStats);

export const updateFeedUserStatsSchema = createUpdateSchema(feedUserStats, {
  id: z.undefined(),
  user_id: z.undefined(),
  feed_id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

// Additional schemas for API requests and responses

/**
 * Schema for activity query options
 */
export const activityQueryOptionsSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  types: z.array(z.enum(activityTypeValues)).optional(),
  feed_id: z.string().optional(),
  from_date: z.string().optional(), // ISO date string
  to_date: z.string().optional(), // ISO date string
});

/**
 * Schema for leaderboard query options
 */
export const leaderboardQueryOptionsSchema = z.object({
  time_range: z
    .enum(["day", "week", "month", "year", "all"])
    .optional()
    .default("all"),
  feed_id: z.string().optional(),
  limit: z.number().optional().default(10),
});

/**
 * Schema for leaderboard entry
 */
export const leaderboardEntrySchema = z.object({
  user_id: z.number(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  total_points: z.number(),
  total_submissions: z.number(),
  total_approvals: z.number(),
  rank: z.number(),
});

/**
 * Schema for global stats
 */
export const globalStatsSchema = z.object({
  total_approvals: z.number(),
  total_submissions: z.number(),
  approval_rate: z.number(), // Percentage
});

// Type exports for convenience
export type InsertActivityData = z.infer<typeof insertActivitySchema>;
export type UpdateActivityData = z.infer<typeof updateActivitySchema>;
export type SelectActivityData = z.infer<typeof selectActivitySchema>;
export type ActivityQueryOptions = z.infer<typeof activityQueryOptionsSchema>;
export type LeaderboardQueryOptions = z.infer<
  typeof leaderboardQueryOptionsSchema
>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type GlobalStats = z.infer<typeof globalStatsSchema>;

// User Stats types
export type InsertUserStatsData = z.infer<typeof insertUserStatsSchema>;
export type UpdateUserStatsData = z.infer<typeof updateUserStatsSchema>;
export type SelectUserStatsData = z.infer<typeof selectUserStatsSchema>;

// Feed User Stats types
export type InsertFeedUserStatsData = z.infer<typeof insertFeedUserStatsSchema>;
export type UpdateFeedUserStatsData = z.infer<typeof updateFeedUserStatsSchema>;
export type SelectFeedUserStatsData = z.infer<typeof selectFeedUserStatsSchema>;
