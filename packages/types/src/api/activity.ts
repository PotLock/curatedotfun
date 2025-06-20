import { z } from "zod";
import { ApiSuccessResponseSchema, QueryOptionsSchema } from "./common";
import { ModerationActionSchema } from "./moderation";

// --- Enums and Basic Types ---

export const activityTypeApiEnum = z.enum([
  "CONTENT_SUBMISSION",
  "CONTENT_APPROVAL",
  "CONTENT_REJECTION", // Added based on service logic
  "TOKEN_BUY",
  "TOKEN_SELL",
  "POINTS_REDEMPTION",
  "POINTS_AWARDED",
]);
export type ActivityTypeApi = z.infer<typeof activityTypeApiEnum>;

// --- Core Schemas ---

export const ActivityDataSchema = z
  .object({
    moderationDetails: ModerationActionSchema.optional(),
  })
  .passthrough();
export type ActivityData = z.infer<typeof ActivityDataSchema>;

export const ActivitySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: activityTypeApiEnum,
  timestamp: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  feed_id: z.string().nullable().optional(),
  submission_id: z.string().nullable().optional(),
  data: ActivityDataSchema.nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  created_at: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  updated_at: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
});
export type Activity = z.infer<typeof ActivitySchema>;

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
  userId: z.string(), // This is NEAR Account ID as per previous DTO
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  score: z.number().int().min(0),
});
export type UserRankingLeaderboardEntry = z.infer<
  typeof UserRankingLeaderboardEntrySchema
>;

// Schema for the output of getUserFeedRanks
export const UserFeedRanksSchema = z.object({
  curatorRank: z.number().nullable(),
  approverRank: z.number().nullable(),
});
export type UserFeedRanks = z.infer<typeof UserFeedRanksSchema>;

export const FeedInfoSchema = z
  .object({
    id: z.string(), // Feed ID
    name: z.string(),
    description: z.string().optional().nullable(),
  })
  .passthrough();
export type FeedInfo = z.infer<typeof FeedInfoSchema>;

// --- Request Parameter Schemas (for Hono routes) ---

// Path Parameters
export const ActivityUserPathParamsSchema = z.object({
  accountId: z.string().describe("NEAR account ID of the user"),
});

export const ActivityFeedPathParamsSchema = z.object({
  feedId: z.string().describe("ID of the feed"),
});

// Query Parameters

// For GET /leaderboard
export const GetLeaderboardApiQuerySchema = QueryOptionsSchema.extend({
  time_range: z.enum(["day", "week", "month", "year", "all"]).optional(),
  feed_id: z.string().optional(),
});
export type GetLeaderboardApiQuery = z.infer<
  typeof GetLeaderboardApiQuerySchema
>;

// For GET /user/:accountId (activities)
export const GetUserActivitiesApiQuerySchema = QueryOptionsSchema.extend({
  types: z
    .string()
    .optional()
    .describe("Comma-separated list of activity types"),
  feed_id: z.string().optional(),
  from_date: z
    .string()
    .datetime({
      message:
        "Invalid datetime string for from_date. Must be UTC and in ISO8601 format.",
    })
    .optional(),
  to_date: z
    .string()
    .datetime({
      message:
        "Invalid datetime string for to_date. Must be UTC and in ISO8601 format.",
    })
    .optional(),
}).transform((data) => {
  let validatedTypes: ActivityTypeApi[] | undefined = undefined;
  if (data.types) {
    const typeArray = data.types
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    validatedTypes = typeArray.filter((t) =>
      activityTypeApiEnum.options.includes(t as any),
    ) as ActivityTypeApi[];

    if (validatedTypes.length === 0) {
      validatedTypes = undefined;
    }
  }

  return {
    limit: data.limit !== undefined ? Number(data.limit) : 20,
    offset: data.offset !== undefined ? Number(data.offset) : 0,
    sortBy: data.sortBy || "timestamp",
    sortOrder: data.sortOrder || "desc",
    types: validatedTypes,
    feed_id: data.feed_id,
    from_date: data.from_date,
    to_date: data.to_date,
  };
});
export type GetUserActivitiesApiQuery = z.infer<
  typeof GetUserActivitiesApiQuerySchema
>;

// --- Wrapped Response Schemas ---

export const ActivityListResponseSchema = ApiSuccessResponseSchema(
  z.array(ActivitySchema),
);
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;

export const LeaderboardResponseSchema = ApiSuccessResponseSchema(
  z.array(UserRankingLeaderboardEntrySchema),
);
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

export const GlobalStatsResponseSchema =
  ApiSuccessResponseSchema(GlobalStatsSchema);
export type GlobalStatsResponse = z.infer<typeof GlobalStatsResponseSchema>;

export const FeedInfoListResponseSchema = ApiSuccessResponseSchema(
  z.array(FeedInfoSchema),
);
export type FeedInfoListResponse = z.infer<typeof FeedInfoListResponseSchema>;

export const UserFeedRankResponseSchema =
  ApiSuccessResponseSchema(UserFeedRanksSchema);
export type UserFeedRankResponse = z.infer<typeof UserFeedRankResponseSchema>;
