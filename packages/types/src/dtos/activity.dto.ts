import { z } from 'zod';
import { activityTypeEnum } from '../db';

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
export type UserRankingLeaderboardEntry = z.infer<typeof UserRankingLeaderboardEntrySchema>;

// Schema for Activity Query Options
export const ActivityQueryOptionsSchema = z.object({
  userId: z.string().optional(),
  type: activityTypeEnumSchema.optional(),
  // Assuming SubmissionStatus might also be a filter, will need to import/define if so
  // status: z.enum(['pending', 'approved', 'rejected']).optional(), // Example
  limit: z.number().int().min(1).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type ActivityQueryOptions = z.infer<typeof ActivityQueryOptionsSchema>;

// Schema for Leaderboard Query Options
export const LeaderboardQueryOptionsSchema = z.object({
  limit: z.number().int().min(1).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  // Potentially add other options like time period, specific activity types for leaderboard
});
export type LeaderboardQueryOptions = z.infer<typeof LeaderboardQueryOptionsSchema>;
