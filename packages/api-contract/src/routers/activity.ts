import { selectActivitySchema, selectFeedSchema } from '@curatedotfun/shared-db';
import {
  GetLeaderboardInputSchema,
  GetMyActivitiesInputSchema,
  GetMyFeedRankInputSchema,
  GetUserActivitiesInputSchema,
  GlobalStatsSchema,
  UserFeedRanksSchema,
  UserRankingLeaderboardEntrySchema
} from '@curatedotfun/types';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';

// --- Procedure Definitions ---

export const getGlobalStatsDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/global-stats', tags: ['activity'] } as const },
  output: GlobalStatsSchema,
};

export const getLeaderboardDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/leaderboard', tags: ['activity'] } as const },
  input: GetLeaderboardInputSchema.optional(),
  output: z.object({ leaderboard: z.array(UserRankingLeaderboardEntrySchema) }),
};

export const getMyActivitiesDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/user/me', tags: ['activity'] } as const },
  input: GetMyActivitiesInputSchema,
  output: z.object({ activities: z.array(selectActivitySchema) }),
};

export const getUserActivitiesDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/user/{userId}', tags: ['activity'] } as const },
  input: GetUserActivitiesInputSchema,
  output: z.object({ activities: z.array(selectActivitySchema) }),
};

export const getMyCuratedFeedsDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/feeds/curated-by-me', tags: ['activity', 'feed'] } as const },
  output: z.object({ feeds: z.array(selectFeedSchema) }),
};

export const getMyApprovedFeedsDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/feeds/approved-by-me', tags: ['activity', 'feed'] } as const },
  output: z.object({ feeds: z.array(selectFeedSchema) }),
};

export const getMyFeedRankDefinition = {
  meta: { openapi: { method: 'GET', path: '/activity/feeds/{feedId}/my-rank', tags: ['activity', 'feed', 'ranking'] } as const },
  input: GetMyFeedRankInputSchema,
  output: z.object({ ranks: UserFeedRanksSchema }),
};

// --- Contract Router ---

const getGlobalStatsContract = publicProcedure
  .meta({ openapi: { ...getGlobalStatsDefinition.meta.openapi, tags: [...getGlobalStatsDefinition.meta.openapi.tags] } })
  .output(getGlobalStatsDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

const getLeaderboardContract = publicProcedure
  .meta({ openapi: { ...getLeaderboardDefinition.meta.openapi, tags: [...getLeaderboardDefinition.meta.openapi.tags] } })
  .input(getLeaderboardDefinition.input)
  .output(getLeaderboardDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

const getMyActivitiesContract = protectedProcedure
  .meta({ openapi: { ...getMyActivitiesDefinition.meta.openapi, tags: [...getMyActivitiesDefinition.meta.openapi.tags] } })
  .input(getMyActivitiesDefinition.input)
  .output(getMyActivitiesDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

const getUserActivitiesContract = publicProcedure
  .meta({ openapi: { ...getUserActivitiesDefinition.meta.openapi, tags: [...getUserActivitiesDefinition.meta.openapi.tags] } })
  .input(getUserActivitiesDefinition.input)
  .output(getUserActivitiesDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

const getMyCuratedFeedsContract = protectedProcedure
  .meta({ openapi: { ...getMyCuratedFeedsDefinition.meta.openapi, tags: [...getMyCuratedFeedsDefinition.meta.openapi.tags] } })
  .output(getMyCuratedFeedsDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

const getMyApprovedFeedsContract = protectedProcedure
  .meta({ openapi: { ...getMyApprovedFeedsDefinition.meta.openapi, tags: [...getMyApprovedFeedsDefinition.meta.openapi.tags] } })
  .output(getMyApprovedFeedsDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

const getMyFeedRankContract = protectedProcedure
  .meta({ openapi: { ...getMyFeedRankDefinition.meta.openapi, tags: [...getMyFeedRankDefinition.meta.openapi.tags] } })
  .input(getMyFeedRankDefinition.input)
  .output(getMyFeedRankDefinition.output)
  .query(() => { throw new Error("Contract method not implemented."); });

export const activityContractRouter = router({
  getGlobalStats: getGlobalStatsContract,
  getLeaderboard: getLeaderboardContract,
  getMyActivities: getMyActivitiesContract,
  getUserActivities: getUserActivitiesContract,
  getMyCuratedFeeds: getMyCuratedFeedsContract,
  getMyApprovedFeeds: getMyApprovedFeedsContract,
  getMyFeedRank: getMyFeedRankContract,
});

export type ActivityContractRouter = typeof activityContractRouter;
