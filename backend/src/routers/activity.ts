import {
  type ActivityContractRouter,
  getGlobalStatsDefinition,
  getLeaderboardDefinition,
  getMyActivitiesDefinition,
  getMyApprovedFeedsDefinition,
  getMyCuratedFeedsDefinition,
  getMyFeedRankDefinition,
  getUserActivitiesDefinition,
} from "@curatedotfun/api-contract";
import {
  handleServiceError,
  protectedProcedure,
  publicProcedure,
  router,
} from "../trpc";

// --- Procedures ---

// GET /activity/global-stats
const getGlobalStatsProcedure = publicProcedure
  .meta({
    openapi: {
      ...getGlobalStatsDefinition.meta.openapi,
      tags: [...getGlobalStatsDefinition.meta.openapi.tags],
    },
  })
  .output(getGlobalStatsDefinition.output)
  .query(async ({ ctx }) => {
    try {
      const activityService = ctx.sp.getActivityService();
      const stats = await activityService.getGlobalStats();
      return stats;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /activity/leaderboard
const getLeaderboardProcedure = publicProcedure
  .meta({
    openapi: {
      ...getLeaderboardDefinition.meta.openapi,
      tags: [...getLeaderboardDefinition.meta.openapi.tags],
    },
  })
  .input(getLeaderboardDefinition.input)
  .output(getLeaderboardDefinition.output)
  .query(async ({ ctx, input }) => {
    try {
      const activityService = ctx.sp.getActivityService();
      const leaderboard =
        await activityService.getUserRankingLeaderboard(input);
      return { leaderboard };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /activity/user/me
const getMyActivitiesProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getMyActivitiesDefinition.meta.openapi,
      tags: [...getMyActivitiesDefinition.meta.openapi.tags],
    },
  })
  .input(getMyActivitiesDefinition.input)
  .output(getMyActivitiesDefinition.output)
  .query(async ({ ctx, input }) => {
    try {
      const userService = ctx.sp.getUserService();
      const user = await userService.findUserByAuthProviderId(
        ctx.authProviderId as string,
      );

      if (!user) {
        // This case should ideally be handled by handleServiceError or a specific TRPCError
        throw new Error("User profile not found"); // Or TRPCError NOT_FOUND
      }

      const activityService = ctx.sp.getActivityService();
      const activities = await activityService.getUserActivities(
        user.id,
        input,
      );
      return { activities };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET //activity/user/{userId}
const getUserActivitiesProcedure = publicProcedure
  .meta({
    openapi: {
      ...getUserActivitiesDefinition.meta.openapi,
      tags: [...getUserActivitiesDefinition.meta.openapi.tags],
    },
  })
  .input(getUserActivitiesDefinition.input)
  .output(getUserActivitiesDefinition.output)
  .query(async ({ ctx, input }) => {
    try {
      const activityService = ctx.sp.getActivityService();
      // The service expects userId as a number.
      // GetUserActivitiesInputSchema has userId as string, consistent with other DTOs.
      // We'll parse it here.
      const numericUserId = parseInt(input.userId, 10);
      if (isNaN(numericUserId)) {
        // This should ideally be caught by a more specific Zod transform if we want strict number input
        // or handled by handleServiceError if it throws a TRPCError.BAD_REQUEST
        throw new Error("Invalid userId format");
      }
      const activities = await activityService.getUserActivities(
        numericUserId,
        input.options,
      );
      return { activities };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /activity/feeds/curated-by-me
const getMyCuratedFeedsProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getMyCuratedFeedsDefinition.meta.openapi,
      tags: [...getMyCuratedFeedsDefinition.meta.openapi.tags],
    },
  })
  .output(getMyCuratedFeedsDefinition.output)
  .query(async ({ ctx }) => {
    try {
      const userService = ctx.sp.getUserService();
      const user = await userService.findUserByAuthProviderId(
        ctx.authProviderId as string,
      );

      if (!user) {
        throw new Error("User profile not found");
      }

      const activityService = ctx.sp.getActivityService();
      const feeds = await activityService.getFeedsCuratedByUser(user.id);
      return { feeds };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /activity/feeds/approved-by-me
const getMyApprovedFeedsProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getMyApprovedFeedsDefinition.meta.openapi,
      tags: [...getMyApprovedFeedsDefinition.meta.openapi.tags],
    },
  })
  .output(getMyApprovedFeedsDefinition.output)
  .query(async ({ ctx }) => {
    try {
      const userService = ctx.sp.getUserService();
      const user = await userService.findUserByAuthProviderId(
        ctx.authProviderId as string,
      );

      if (!user) {
        throw new Error("User profile not found");
      }

      const activityService = ctx.sp.getActivityService();
      const feeds = await activityService.getFeedsApprovedByUser(user.id);
      return { feeds };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /activity/feeds/{feedId}/my-rank
const getMyFeedRankProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getMyFeedRankDefinition.meta.openapi,
      tags: [...getMyFeedRankDefinition.meta.openapi.tags],
    },
  })
  .input(getMyFeedRankDefinition.input)
  .output(getMyFeedRankDefinition.output)
  .query(async ({ ctx, input }) => {
    try {
      const userService = ctx.sp.getUserService();
      const user = await userService.findUserByAuthProviderId(
        ctx.authProviderId as string,
      );

      if (!user) {
        throw new Error("User profile not found");
      }

      const activityService = ctx.sp.getActivityService();
      const ranks = await activityService.getUserFeedRanks(
        user.id,
        input.feedId,
      );
      return { ranks };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// --- Router ---
export const activityRouter: ActivityContractRouter = router({
  getGlobalStats: getGlobalStatsProcedure,
  getLeaderboard: getLeaderboardProcedure,
  getMyActivities: getMyActivitiesProcedure,
  getUserActivities: getUserActivitiesProcedure,
  getMyCuratedFeeds: getMyCuratedFeedsProcedure,
  getMyApprovedFeeds: getMyApprovedFeedsProcedure,
  getMyFeedRank: getMyFeedRankProcedure,
});

// for catching type errors
const _assertActivityRouterConforms: ActivityContractRouter = activityRouter;
