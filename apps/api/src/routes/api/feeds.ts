import { FeedService } from "@curatedotfun/core-services";
import {
  ApiErrorResponseSchema,
  CanModerateResponseSchema,
  CreateFeedRequestSchema,
  FeedsWrappedResponseSchema,
  FeedWrappedResponseSchema,
  UpdateFeedRequestSchema,
} from "@curatedotfun/types";
import { ForbiddenError, NotFoundError } from "@curatedotfun/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../../types/app";

const feedsRoutes = new Hono<Env>();

const feedIdParamSchema = z.object({
  feedId: z.string().min(1, "Feed ID is required"),
});

// GET /api/feeds - Get all feeds
feedsRoutes.get("/", async (c) => {
  try {
    const sp = c.var.sp;
    const feedService: FeedService = sp.getFeedService();
    const feeds = await feedService.getAllFeeds();
    return c.json(
      FeedsWrappedResponseSchema.parse({
        statusCode: 200,
        success: true,
        data: feeds.map((feed) => ({
          ...feed,
          config: feed.config,
        })),
      }),
    );
  } catch (error) {
    c.var.sp.getLogger().error({ error }, "Error fetching all feeds");
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to fetch feeds" },
      }),
      500,
    );
  }
});

// POST /api/feeds - Create a new feed
feedsRoutes.post(
  "/",
  zValidator("json", CreateFeedRequestSchema),
  async (c) => {
    const accountId = c.get("accountId");
    if (!accountId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 401,
          success: false,
          error: { message: "Unauthorized. User must be logged in." },
        }),
        401,
      );
    }

    try {
      const feedConfig = c.req.valid("json");
      const sp = c.var.sp;
      const feedService = sp.getFeedService();
      const newFeed = await feedService.createFeed(feedConfig, accountId);

      return c.json(
        FeedWrappedResponseSchema.parse({
          statusCode: 201,
          success: true,
          data: {
            ...newFeed,
            config: newFeed.config,
          },
        }),
        201,
      );
    } catch (error) {
      c.var.sp.getLogger().error({ error, accountId }, "Error creating feed");
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to create feed" },
        }),
        500,
      );
    }
  },
);

// GET /api/feeds/:feedId - Get a specific feed
feedsRoutes.get(
  "/:feedId",
  zValidator("param", feedIdParamSchema),
  async (c) => {
    try {
      const { feedId } = c.req.valid("param");
      const sp = c.var.sp;
      const feedService = sp.getFeedService();
      const feed = await feedService.getFeedById(feedId);

      return c.json(
        FeedWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: {
            ...feed,
            config: feed.config,
          },
        }),
      );
    } catch (error) {
      c.var.sp.getLogger().error({ error }, `Error fetching feed`);
      if (error instanceof NotFoundError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: error.message },
          }),
          404,
        );
      }
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to fetch feed" },
        }),
        500,
      );
    }
  },
);

// PUT /api/feeds/:feedId - Update an existing feed
feedsRoutes.put(
  "/:feedId",
  zValidator("param", feedIdParamSchema),
  zValidator("json", UpdateFeedRequestSchema),
  async (c) => {
    const accountId = c.get("accountId");
    if (!accountId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 401,
          success: false,
          error: { message: "Unauthorized. User must be logged in." },
        }),
        401,
      );
    }

    try {
      const { feedId } = c.req.valid("param");
      const feedConfig = c.req.valid("json");
      const sp = c.var.sp;
      const feedService = sp.getFeedService();

      const updatedFeed = await feedService.updateFeed(
        feedId,
        feedConfig,
        accountId,
      );

      return c.json(
        FeedWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: {
            ...updatedFeed,
            config: updatedFeed.config,
          },
        }),
      );
    } catch (error) {
      c.var.sp.getLogger().error({ error, accountId }, "Error updating feed");
      if (error instanceof NotFoundError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: error.message },
          }),
          404,
        );
      }
      if (error instanceof ForbiddenError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 403,
            success: false,
            error: { message: error.message },
          }),
          403,
        );
      }
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to update feed" },
        }),
        500,
      );
    }
  },
);

// DELETE /api/feeds/:feedId - Delete a feed
feedsRoutes.delete(
  "/:feedId",
  zValidator("param", feedIdParamSchema),
  async (c) => {
    const accountId = c.get("accountId");
    if (!accountId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 401,
          success: false,
          error: { message: "Unauthorized. User must be logged in." },
        }),
        401,
      );
    }

    try {
      const { feedId } = c.req.valid("param");
      const sp = c.var.sp;
      const feedService = sp.getFeedService();
      await feedService.deleteFeed(feedId, accountId);
      return c.body(null, 204);
    } catch (error: unknown) {
      c.var.sp.getLogger().error({ error, accountId }, "Error deleting feed");
      if (error instanceof NotFoundError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: error.message },
          }),
          404,
        );
      }
      if (error instanceof ForbiddenError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 403,
            success: false,
            error: { message: error.message },
          }),
          403,
        );
      }
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to delete feed" },
        }),
        500,
      );
    }
  },
);

// GET /api/feeds/:feedId/can-moderate - Check moderation permission
feedsRoutes.get(
  "/:feedId/can-moderate",
  zValidator("param", feedIdParamSchema),
  async (c) => {
    const actingAccountId = c.get("accountId");
    if (!actingAccountId) {
      return c.json(
        CanModerateResponseSchema.parse({
          canModerate: false,
          reason: "User not authenticated",
        }),
      );
    }

    try {
      const { feedId } = c.req.valid("param");
      const sp = c.var.sp;
      const moderationService = sp.getModerationService();
      const canModerate =
        await moderationService.checkUserFeedModerationPermission(
          feedId,
          actingAccountId,
        );
      return c.json(CanModerateResponseSchema.parse({ canModerate }));
    } catch (error: unknown) {
      c.var.sp
        .getLogger()
        .error({ error, actingAccountId }, "Error in /:feedId/can-moderate");
      return c.json(
        CanModerateResponseSchema.parse({
          canModerate: false,
          error: "Failed to check moderation permission",
        }),
        500,
      );
    }
  },
);

export { feedsRoutes };
