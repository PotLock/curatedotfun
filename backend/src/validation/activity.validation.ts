import { z } from "zod";
import * as schema from "../services/db/schema";

export const activityTypeEnum = z.nativeEnum(schema.ActivityType);

/**
 * Schema for activity query options
 */
export const activityQueryOptionsSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  types: z.array(activityTypeEnum).optional(),
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
 * Schema for global stats
 */
export const globalStatsSchema = z.object({
  total_approvals: z.number(),
  total_submissions: z.number(),
  approval_rate: z.number(), // Percentage
});

// Type exports for convenience
export type ActivityType = z.infer<typeof activityTypeEnum>;
export type ActivityQueryOptions = z.infer<typeof activityQueryOptionsSchema>;
export type LeaderboardQueryOptions = z.infer<
  typeof leaderboardQueryOptionsSchema
>;
export type GlobalStats = z.infer<typeof globalStatsSchema>;

/**
 * Schema for a single entry in the user ranking leaderboard
 */
export const userRankingLeaderboardEntrySchema = z.object({
  user_id: z.number(),
  username: z.string(),
  name: z.string().nullable(), // u.name from users table
  total_points: z.number(),
  total_submissions: z.number(),
  total_approvals: z.number(),
  rank: z.number(),
});
export type UserRankingLeaderboardEntry = z.infer<
  typeof userRankingLeaderboardEntrySchema
>;
