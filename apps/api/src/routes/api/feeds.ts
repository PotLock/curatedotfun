import { Hono } from "hono";
import { Env } from "../../types/app";
import { badRequest } from "../../utils/error";
import { logger } from "../../utils/logger";
import { insertFeedSchema, updateFeedSchema } from "@curatedotfun/shared-db";

const feedsRoutes = new Hono<Env>();

/**
 * Get all feeds
 */
feedsRoutes.get("/", async (c) => {
  const sp = c.get("sp");
  const feedService = sp.getFeedService();
  try {
    const feeds = await feedService.getAllFeeds();
    return c.json(feeds);
  } catch (error) {
    logger.error("Error fetching all feeds:", error);
    return c.json({ error: "Failed to fetch feeds" }, 500);
  }
});

/**
 * Create a new feed
 */
feedsRoutes.post("/", async (c) => {
  const accountId = c.get("accountId");
  if (!accountId) {
    return c.json(
      { error: "Unauthorized. User must be logged in to create a feed." },
      401,
    );
  }

  const body = await c.req.json();
  const partialValidationResult = insertFeedSchema
    .omit({ created_by: true })
    .safeParse(body);

  if (!partialValidationResult.success) {
    return badRequest(
      c,
      "Invalid feed data",
      partialValidationResult.error.flatten(),
    );
  }

  const feedDataWithCreator = {
    ...partialValidationResult.data,
    created_by: accountId,
  };

  const finalValidationResult = insertFeedSchema.safeParse(feedDataWithCreator);
  if (!finalValidationResult.success) {
    logger.error(
      "Error in final validation after adding created_by",
      finalValidationResult.error,
    );
    return badRequest(
      c,
      "Internal validation error",
      finalValidationResult.error.flatten(),
    );
  }

  const sp = c.get("sp");
  const feedService = sp.getFeedService();
  try {
    const newFeed = await feedService.createFeed(finalValidationResult.data);
    return c.json(newFeed, 201);
  } catch (error) {
    logger.error("Error creating feed:", error);
    return c.json({ error: "Failed to create feed" }, 500);
  }
});

/**
 * Get a specific feed by its ID
 */
feedsRoutes.get("/:feedId", async (c) => {
  const feedId = c.req.param("feedId");
  const sp = c.get("sp");
  const feedService = sp.getFeedService();
  try {
    const feed = await feedService.getFeedById(feedId);
    if (!feed) {
      return c.notFound();
    }
    return c.json(feed);
  } catch (error) {
    logger.error(`Error fetching feed ${feedId}:`, error);
    return c.json({ error: "Failed to fetch feed" }, 500);
  }
});

/**
 * Update an existing feed
 */
feedsRoutes.put("/:feedId", async (c) => {
  const accountId = c.get("accountId");
  if (!accountId) {
    return c.json(
      { error: "Unauthorized. User must be logged in to update a feed." },
      401,
    );
  }

  const feedId = c.req.param("feedId");
  const sp = c.get("sp");
  const feedService = sp.getFeedService();

  const canUpdate = await feedService.hasPermission(
    accountId,
    feedId,
    "update",
  );
  if (!canUpdate) {
    return c.json(
      { error: "Forbidden. You do not have permission to update this feed." },
      403,
    );
  }

  const body = await c.req.json();
  const validationResult = updateFeedSchema.safeParse(body);

  if (!validationResult.success) {
    return badRequest(c, "Invalid feed data", validationResult.error.flatten());
  }

  try {
    const updatedFeed = await feedService.updateFeed(
      feedId,
      validationResult.data,
    );
    if (!updatedFeed) {
      return c.notFound();
    }
    return c.json(updatedFeed);
  } catch (error) {
    logger.error(`Error updating feed ${feedId}:`, error);
    return c.json({ error: "Failed to update feed" }, 500);
  }
});

/**
 * Process approved submissions for a feed
 * Optional query parameter: distributors - comma-separated list of distributor plugins to use
 * Example: /api/feeds/solana/process?distributors=@curatedotfun/rss
 */
feedsRoutes.post("/:feedId/process", async (c) => {
  const accountId = c.get("accountId");
  if (!accountId) {
    return c.json(
      { error: "Unauthorized. User must be logged in to process a feed." },
      401,
    );
  }

  const sp = c.get("sp");
  const feedService = sp.getFeedService();

  const feedId = c.req.param("feedId");
  const distributorsParam = c.req.query("distributors");

  try {
    const result = await feedService.processFeed(feedId, distributorsParam);
    return c.json(result);
  } catch (error: any) {
    logger.error(`Error processing feed ${feedId}:`, error);
    // FeedService.processFeed might throw specific errors (e.g., NotFoundError)
    // For now, a generic 500, but could be more specific based on error type
    if (error.message && error.message.startsWith("Feed not found")) {
      return c.json({ error: error.message }, 404);
    }
    if (
      error.message &&
      error.message.startsWith("Feed configuration not found")
    ) {
      return c.json({ error: error.message }, 404); // Or 500 if it's an internal config issue
    }
    return c.json({ error: "Failed to process feed" }, 500);
  }
});

/**
 * Delete a specific feed by its ID
 */
feedsRoutes.delete("/:feedId", async (c) => {
  const accountId = c.get("accountId");
  if (!accountId) {
    return c.json(
      { error: "Unauthorized. User must be logged in to delete a feed." },
      401,
    );
  }

  const feedId = c.req.param("feedId");
  const sp = c.get("sp");
  const feedService = sp.getFeedService();

  const canDelete = await feedService.hasPermission(
    accountId,
    feedId,
    "delete",
  );
  if (!canDelete) {
    return c.json(
      { error: "Forbidden. You do not have permission to delete this feed." },
      403,
    );
  }

  try {
    const result = await feedService.deleteFeed(feedId);
    if (!result) {
      return c.notFound();
    }
    return c.json({ message: "Feed deleted successfully" }, 200);
  } catch (error) {
    logger.error(`Error deleting feed ${feedId}:`, error);
    return c.json({ error: "Failed to delete feed" }, 500);
  }
});

export { feedsRoutes };
