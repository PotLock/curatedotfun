import { Hono } from "hono";
import { Env } from "../../types/app";
import { badRequest } from "../../utils/error";
import { logger } from "../../utils/logger";
import {
  insertFeedSchema,
  updateFeedSchema,
} from "@curatedotfun/shared-db";

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
  const body = await c.req.json();
  const validationResult = insertFeedSchema.safeParse(body);

  if (!validationResult.success) {
    return badRequest(c, "Invalid feed data", validationResult.error.flatten());
  }

  const sp = c.get("sp");
  const feedService = sp.getFeedService();
  try {
    const newFeed = await feedService.createFeed(validationResult.data);
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
 * Get submissions for a specific feed
 */
feedsRoutes.get("/:feedId/submissions", async (c) => {
  const feedId = c.req.param("feedId");
  const sp = c.get("sp");
  const feedService = sp.getFeedService();
  try {
    const submissions = await feedService.getSubmissionsByFeed(feedId);
    if (submissions === null) {
      return c.notFound();
    }
    return c.json(submissions);
  } catch (error) {
    logger.error(`Error fetching submissions for feed ${feedId}:`, error);
    return c.json({ error: "Failed to fetch submissions" }, 500);
  }
});

/**
 * Update an existing feed
 */
feedsRoutes.put("/:feedId", async (c) => {
  const feedId = c.req.param("feedId");
  const body = await c.req.json();
  const validationResult = updateFeedSchema.safeParse(body);

  if (!validationResult.success) {
    return badRequest(c, "Invalid feed data", validationResult.error.flatten());
  }

  const sp = c.get("sp");
  const feedService = sp.getFeedService();
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

export { feedsRoutes };
