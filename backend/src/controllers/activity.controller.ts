import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { Env } from "../types/app";
import { ActivityServiceError } from "../types/errors";
import { ServiceProvider } from "../utils/service-provider";
import {
  activityQueryOptionsSchema,
  leaderboardQueryOptionsSchema,
} from "../validation/activity.validation";

const activityController = new Hono<Env>();

/**
 * GET /api/activity/leaderboard
 * Get the leaderboard
 */
activityController.get(
  "/leaderboard",
  zValidator(
    "query",
    z.object({
      time_range: z.enum(["day", "week", "month", "year", "all"]).optional(),
      feed_id: z.string().optional(),
      limit: z.string().transform(Number).optional(),
    }),
  ),
  async (c) => {
    try {
      const query = c.req.valid("query");
      const options = leaderboardQueryOptionsSchema.parse({
        time_range: query.time_range,
        feed_id: query.feed_id,
        limit: query.limit,
      });

      // Get the activity service from the service provider
      const activityService =
        ServiceProvider.getInstance().getActivityService();
      const leaderboard = await activityService.getLeaderboard(options);

      return c.json({ leaderboard });
    } catch (error) {
      console.error("Error in activityController.get('/leaderboard'):", error);

      if (error instanceof ActivityServiceError) {
        return c.json(
          { error: error.message },
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        { error: "Failed to fetch leaderboard" },
        error instanceof Error && error.name === "ValidationError" ? 400 : 500,
      );
    }
  },
);

/**
 * GET /api/activity/stats
 * Get global activity statistics
 */
activityController.get("/stats", async (c) => {
  try {
    // Get the activity service from the service provider
    const activityService = ServiceProvider.getInstance().getActivityService();
    const stats = await activityService.getGlobalStats();

    return c.json({ stats });
  } catch (error) {
    console.error("Error in activityController.get('/stats'):", error);

    if (error instanceof ActivityServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to fetch global stats" }, 500);
  }
});

/**
 * GET /api/activity/user/me
 * Get activity log for the authenticated user
 */
activityController.get("/user/me", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    // Get services from the service provider
    const serviceProvider = ServiceProvider.getInstance();
    const userService = serviceProvider.getUserService();
    const activityService = serviceProvider.getActivityService();

    // Get the user from the auth provider ID
    const user = await userService.findUserByAuthProviderId(authProviderId);

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get the user's activities
    const activities = await activityService.getUserActivities(user.id);

    return c.json({ activities });
  } catch (error) {
    console.error("Error in activityController.get('/user/me'):", error);

    if (error instanceof ActivityServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to fetch user activities" }, 500);
  }
});

/**
 * GET /api/activity/user/:userId
 * Get activity log for a specific user
 */
activityController.get(
  "/user/:userId",
  zValidator(
    "param",
    z.object({
      userId: z.string().transform(Number),
    }),
  ),
  zValidator(
    "query",
    z.object({
      limit: z.string().transform(Number).optional(),
      offset: z.string().transform(Number).optional(),
      types: z.string().optional(),
      feed_id: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
  ),
  async (c) => {
    try {
      const { userId } = c.req.valid("param");
      const query = c.req.valid("query");

      // Parse types if provided
      let types;
      if (query.types) {
        types = query.types.split(",");
      }

      const options = activityQueryOptionsSchema.parse({
        limit: query.limit,
        offset: query.offset,
        types,
        feed_id: query.feed_id,
        from_date: query.from_date,
        to_date: query.to_date,
      });

      // Get the activity service from the service provider
      const activityService =
        ServiceProvider.getInstance().getActivityService();
      const activities = await activityService.getUserActivities(
        userId,
        options,
      );

      return c.json({ activities });
    } catch (error) {
      console.error("Error in activityController.get('/user/:userId'):", error);

      if (error instanceof ActivityServiceError) {
        return c.json(
          { error: error.message },
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        { error: "Failed to fetch user activities" },
        error instanceof Error && error.name === "ValidationError" ? 400 : 500,
      );
    }
  },
);

/**
 * GET /api/activity/feeds/curated-by/me
 * Get feeds curated by the authenticated user
 */
activityController.get("/feeds/curated-by/me", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    // Get services from the service provider
    const serviceProvider = ServiceProvider.getInstance();
    const userService = serviceProvider.getUserService();
    const activityService = serviceProvider.getActivityService();

    // Get the user from the auth provider ID
    const user = await userService.findUserByAuthProviderId(authProviderId);

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get the feeds curated by the user
    const feeds = await activityService.getFeedsCuratedByUser(user.id);

    return c.json({ feeds });
  } catch (error) {
    console.error(
      "Error in activityController.get('/feeds/curated-by/me'):",
      error,
    );

    if (error instanceof ActivityServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to fetch curated feeds" }, 500);
  }
});

/**
 * GET /api/activity/feeds/approved-by/me
 * Get feeds approved by the authenticated user
 */
activityController.get("/feeds/approved-by/me", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    // Get services from the service provider
    const serviceProvider = ServiceProvider.getInstance();
    const userService = serviceProvider.getUserService();
    const activityService = serviceProvider.getActivityService();

    // Get the user from the auth provider ID
    const user = await userService.findUserByAuthProviderId(authProviderId);

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // Get the feeds approved by the user
    const feeds = await activityService.getFeedsApprovedByUser(user.id);

    return c.json({ feeds });
  } catch (error) {
    console.error(
      "Error in activityController.get('/feeds/approved-by/me'):",
      error,
    );

    if (error instanceof ActivityServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to fetch approved feeds" }, 500);
  }
});

/**
 * GET /api/activity/feeds/:feedId/my-rank
 * Get the user's rank for a specific feed
 */
activityController.get(
  "/feeds/:feedId/my-rank",
  zValidator(
    "param",
    z.object({
      feedId: z.string(),
    }),
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    const authProviderId = jwtPayload?.authProviderId;

    if (!authProviderId) {
      return c.json(
        { error: "Unauthorized: Missing or invalid authentication token" },
        401,
      );
    }

    try {
      const { feedId } = c.req.valid("param");

      // Get services from the service provider
      const serviceProvider = ServiceProvider.getInstance();
      const userService = serviceProvider.getUserService();
      const activityService = serviceProvider.getActivityService();

      // Get the user from the auth provider ID
      const user = await userService.findUserByAuthProviderId(authProviderId);

      if (!user) {
        return c.json({ error: "User profile not found" }, 404);
      }

      // Get the user's rank for the feed
      const ranks = await activityService.getUserFeedRanks(user.id, feedId);

      return c.json({ ranks });
    } catch (error) {
      console.error(
        "Error in activityController.get('/feeds/:feedId/my-rank'):",
        error,
      );

      if (error instanceof ActivityServiceError) {
        return c.json(
          { error: error.message },
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json({ error: "Failed to fetch user feed ranks" }, 500);
    }
  },
);

export { activityController };
