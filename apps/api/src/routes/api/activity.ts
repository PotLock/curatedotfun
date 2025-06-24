import { ActivityServiceError } from "@curatedotfun/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { Env } from "../../types/app";

import {
  ActivityFeedPathParamsSchema,
  ActivityListResponseSchema,
  ActivityUserPathParamsSchema,
  ApiErrorResponseSchema,
  FeedInfoListResponseSchema,
  GetLeaderboardApiQuerySchema,
  GetUserActivitiesApiQuerySchema,
  GlobalStatsResponseSchema,
  LeaderboardResponseSchema,
  UserFeedRankResponseSchema,
} from "@curatedotfun/types";

const activityRoutes = new Hono<Env>();

/**
 * GET /api/activity/leaderboard
 * Get the leaderboard
 */
activityRoutes.get(
  "/leaderboard",
  zValidator("query", GetLeaderboardApiQuerySchema),
  async (c) => {
    try {
      const options = c.req.valid("query");

      const sp = c.var.sp;
      const activityService = sp.getActivityService();
      const leaderboard =
        await activityService.getUserRankingLeaderboard(options);

      return c.json(
        LeaderboardResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: leaderboard,
        }),
      );
    } catch (error) {
      console.error("Error in activityRoutes.get('/leaderboard'):", error);

      if (error instanceof ActivityServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }
      const message =
        error instanceof Error && error.name === "ValidationError"
          ? "Invalid query parameters"
          : "Failed to fetch leaderboard";
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode:
            error instanceof Error && error.name === "ValidationError"
              ? 400
              : 500,
          success: false,
          error: { message },
        }),
        error instanceof Error && error.name === "ValidationError" ? 400 : 500,
      );
    }
  },
);

/**
 * GET /api/activity/stats
 * Get global activity statistics
 */
activityRoutes.get("/stats", async (c) => {
  try {
    const sp = c.var.sp;
    const activityService = sp.getActivityService();
    const stats = await activityService.getGlobalStats();

    return c.json(
      GlobalStatsResponseSchema.parse({
        statusCode: 200,
        success: true,
        data: stats,
      }),
    );
  } catch (error) {
    console.error("Error in activityRoutes.get('/stats'):", error);

    if (error instanceof ActivityServiceError) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: error.statusCode as ContentfulStatusCode,
          success: false,
          error: { message: error.message },
        }),
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to fetch global stats" },
      }),
      500,
    );
  }
});

/**
 * GET /api/activity/user/me
 * Get activity log for the authenticated user
 */
activityRoutes.get("/user/me", async (c) => {
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 401,
        success: false,
        error: {
          message: "Unauthorized: Missing or invalid authentication token",
        },
      }),
      401,
    );
  }

  try {
    // Get services from the service provider
    const sp = c.var.sp;
    const activityService = sp.getActivityService();

    const activities = await activityService.getUserActivities(accountId);

    return c.json(
      ActivityListResponseSchema.parse({
        statusCode: 200,
        success: true,
        data: activities,
      }),
    );
  } catch (error) {
    console.error("Error in activityRoutes.get('/user/me'):", error);

    if (error instanceof ActivityServiceError) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: error.statusCode as ContentfulStatusCode,
          success: false,
          error: { message: error.message },
        }),
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to fetch user activities" },
      }),
      500,
    );
  }
});

/**
 * GET /api/activity/user/:accountId
 * Get activity log for a specific user by NEAR account ID
 */
activityRoutes.get(
  "/user/:accountId",
  zValidator("param", ActivityUserPathParamsSchema),
  zValidator("query", GetUserActivitiesApiQuerySchema),
  async (c) => {
    try {
      const { accountId } = c.req.valid("param");
      const options = c.req.valid("query");
      const sp = c.var.sp;
      const activityService = sp.getActivityService();
      const activities = await activityService.getUserActivities(
        accountId,
        options,
      );

      return c.json(
        ActivityListResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: activities,
        }),
      );
    } catch (error) {
      console.error("Error in activityRoutes.get('/user/:accountId'):", error);

      if (error instanceof ActivityServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }
      const message =
        error instanceof Error && error.name === "ValidationError"
          ? "Invalid query parameters"
          : "Failed to fetch user activities";
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode:
            error instanceof Error && error.name === "ValidationError"
              ? 400
              : 500,
          success: false,
          error: { message },
        }),
        error instanceof Error && error.name === "ValidationError" ? 400 : 500,
      );
    }
  },
);

/**
 * GET /api/activity/feeds/curated-by/me
 * Get feeds curated by the authenticated user
 */
activityRoutes.get("/feeds/curated-by/me", async (c) => {
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 401,
        success: false,
        error: {
          message: "Unauthorized: Missing or invalid authentication token",
        },
      }),
      401,
    );
  }

  try {
    // Get services from the service provider
    const sp = c.var.sp;

    const userService = serviceProvider.getUserService();
    const activityService = serviceProvider.getActivityService();

    const user = await userService.findUserByNearAccountId(accountId);

    if (!user) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 404,
          success: false,
          error: { message: "User profile not found" },
        }),
        404,
      );
    }

    // Get the feeds curated by the user
    const feeds = await activityService.getFeedsCuratedByUser(user.id);

    return c.json(
      FeedInfoListResponseSchema.parse({
        statusCode: 200,
        success: true,
        data: feeds,
      }),
    );
  } catch (error) {
    console.error(
      "Error in activityRoutes.get('/feeds/curated-by/me'):",
      error,
    );

    if (error instanceof ActivityServiceError) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: error.statusCode as ContentfulStatusCode,
          success: false,
          error: { message: error.message },
        }),
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to fetch curated feeds" },
      }),
      500,
    );
  }
});

/**
 * GET /api/activity/feeds/approved-by/me
 * Get feeds approved by the authenticated user
 */
activityRoutes.get("/feeds/approved-by/me", async (c) => {
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 401,
        success: false,
        error: {
          message: "Unauthorized: Missing or invalid authentication token",
        },
      }),
      401,
    );
  }

  try {
    // Get services from the service provider
    const sp = c.var.sp;

    const userService = serviceProvider.getUserService();
    const activityService = serviceProvider.getActivityService();

    const user = await userService.findUserByNearAccountId(accountId);

    if (!user) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 404,
          success: false,
          error: { message: "User profile not found" },
        }),
        404,
      );
    }

    // Get the feeds approved by the user
    const feeds = await activityService.getFeedsApprovedByUser(user.id);

    return c.json(
      FeedInfoListResponseSchema.parse({
        statusCode: 200,
        success: true,
        data: feeds,
      }),
    );
  } catch (error) {
    console.error(
      "Error in activityRoutes.get('/feeds/approved-by/me'):",
      error,
    );

    if (error instanceof ActivityServiceError) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: error.statusCode as ContentfulStatusCode,
          success: false,
          error: { message: error.message },
        }),
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to fetch approved feeds" },
      }),
      500,
    );
  }
});

/**
 * GET /api/activity/feeds/:feedId/my-rank
 * Get the user's rank for a specific feed
 */
activityRoutes.get(
  "/feeds/:feedId/my-rank",
  zValidator("param", ActivityFeedPathParamsSchema),
  async (c) => {
    const accountId = c.get("accountId");

    if (!accountId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 401,
          success: false,
          error: {
            message: "Unauthorized: Missing or invalid authentication token",
          },
        }),
        401,
      );
    }

    try {
      const { feedId } = c.req.valid("param");

      // Get services from the service provider
      const sp = c.var.sp;

      const userService = serviceProvider.getUserService();
      const activityService = serviceProvider.getActivityService();

      const user = await userService.findUserByNearAccountId(accountId);

      if (!user) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: "User profile not found" },
          }),
          404,
        );
      }

      // Get the user's rank for the feed
      const ranks = await activityService.getUserFeedRanks(user.id, feedId);

      return c.json(
        UserFeedRankResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: ranks,
        }),
      );
    } catch (error) {
      console.error(
        "Error in activityRoutes.get('/feeds/:feedId/my-rank'):",
        error,
      );

      if (error instanceof ActivityServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to fetch user feed ranks" },
        }),
        500,
      );
    }
  },
);

export { activityRoutes };
