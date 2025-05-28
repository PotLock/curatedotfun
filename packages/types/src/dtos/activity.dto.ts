import { z } from "zod";
import { activityTypeEnum } from "@curatedotfun/shared-db";

// Enum for activity types, using the one from shared-db via db.ts
export const activityTypeEnumSchema = z.enum(activityTypeEnum.enumValues);

// Schema for Global Stats
export const GlobalStatsSchema = z.object({
  totalUsers: z.number().int().min(0),
  totalSubmissions: z.number().int().min(0),
  totalActivities: z.number().int().min(0),
  pendingSubmissions: z.number().int().min(0),
  approvedSubmissions: z.number().int().min(0),
  rejectedSubmissions: z.number().int().min(0),
});

export type GlobalStats = z.infer<typeof GlobalStatsSchema>;

// Schema for User Ranking Leaderboard Entry
export const UserRankingLeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  userId: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  score: z.number().int().min(0),
  // Add other relevant fields for a leaderboard entry
});
export type UserRankingLeaderboardEntry = z.infer<
  typeof UserRankingLeaderboardEntrySchema
>;

// Schema for Activity Query Options
export const ActivityQueryOptionsSchema = z.object({
  userId: z.string().optional(),
  type: activityTypeEnumSchema.optional(),
  // Assuming SubmissionStatus might also be a filter, will need to import/define if so
  // status: z.enum(['pending', 'approved', 'rejected']).optional(), // Example
  limit: z.number().int().min(1).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type ActivityQueryOptions = z.infer<typeof ActivityQueryOptionsSchema>;

// Schema for Leaderboard Query Options
export const LeaderboardQueryOptionsSchema = z.object({
  limit: z.number().int().min(1).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  // Potentially add other options like time period, specific activity types for leaderboard
});
export type LeaderboardQueryOptions = z.infer<
  typeof LeaderboardQueryOptionsSchema
>;

// --- tRPC Input Schemas ---

// Input schema for getting the leaderboard
// Extends LeaderboardQueryOptionsSchema and adds Hono-specific query params
export const GetLeaderboardInputSchema = LeaderboardQueryOptionsSchema.extend({
  time_range: z.enum(["day", "week", "month", "year", "all"]).optional(),
  feed_id: z.string().optional(),
  // limit is already in LeaderboardQueryOptionsSchema as z.number().int().min(1).optional().default(10)
});
export type GetLeaderboardInput = z.infer<typeof GetLeaderboardInputSchema>;

// Input schema for getting a specific user's activities
// Combines userId (from path) with extended ActivityQueryOptions
export const GetUserActivitiesInputSchema = z.object({
  userId: z.string(), // Consistent with UserRankingLeaderboardEntrySchema.userId
  options: ActivityQueryOptionsSchema.extend({
    types: z.array(activityTypeEnumSchema).optional(), // Hono route had comma-separated string
    from_date: z
      .string()
      .datetime({
        message: "Invalid datetime string. Must be UTC and in ISO8601 format.",
      })
      .optional(),
    to_date: z
      .string()
      .datetime({
        message: "Invalid datetime string. Must be UTC and in ISO8601 format.",
      })
      .optional(),
  })
    .omit({ userId: true }) // Remove optional userId from base as it's mandatory here
    .optional(),
});
export type GetUserActivitiesInput = z.infer<
  typeof GetUserActivitiesInputSchema
>;

// Input schema for getting the authenticated user's ("my") activities
// Similar to GetUserActivitiesInput.options
export const GetMyActivitiesInputSchema = ActivityQueryOptionsSchema.extend({
  types: z.array(activityTypeEnumSchema).optional(),
  from_date: z
    .string()
    .datetime({
      message: "Invalid datetime string. Must be UTC and in ISO8601 format.",
    })
    .optional(),
  to_date: z
    .string()
    .datetime({
      message: "Invalid datetime string. Must be UTC and in ISO8601 format.",
    })
    .optional(),
})
  .omit({ userId: true }) // userId comes from context
  .optional();
export type GetMyActivitiesInput = z.infer<typeof GetMyActivitiesInputSchema>;

// Input schema for getting the authenticated user's rank for a specific feed
export const GetMyFeedRankInputSchema = z.object({
  feedId: z.string(),
});
export type GetMyFeedRankInput = z.infer<typeof GetMyFeedRankInputSchema>;

// Schema for the output of getUserFeedRanks
export const UserFeedRanksSchema = z.object({
  curatorRank: z.number().nullable(),
  approverRank: z.number().nullable(),
});
export type UserFeedRanks = z.infer<typeof UserFeedRanksSchema>;
