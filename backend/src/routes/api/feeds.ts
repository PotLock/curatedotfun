import { Hono } from "hono";
import { Env } from "../../types/app";
import { feedRepository } from "../../services/db/repositories";
import { serviceUnavailable, badRequest } from "../../utils/error";
import { logger } from "../../utils/logger";
import { DistributorConfig, StreamConfig } from "../../types/config";
import {
  insertFeedSchema,
  updateFeedSchema,
} from "../../validation/feed.validation";

const feedsRoutes = new Hono<Env>();

/**
 * Get all feeds
 */
feedsRoutes.get("/", async (c) => {
  try {
    const feeds = await feedRepository.getAllFeeds();
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

  try {
    const newFeed = await feedRepository.createFeed(validationResult.data);
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
  try {
    const feed = await feedRepository.getFeedById(feedId);
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
  try {
    // Check if feed exists before fetching submissions
    const feedExists = await feedRepository.getFeedById(feedId);
    if (!feedExists) {
      return c.notFound();
    }
    const submissions = await feedRepository.getSubmissionsByFeed(feedId);
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

  try {
    const updatedFeed = await feedRepository.updateFeed(
      feedId,
      validationResult.data,
    ); // Assumes this method exists
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
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  let feed;
  try {
    feed = await feedRepository.getFeedById(feedId);
    if (!feed) {
      return c.notFound();
    }
  } catch (error) {
    logger.error(`Error fetching feed ${feedId} for processing:`, error);
    return c.json({ error: "Failed to fetch feed for processing" }, 500);
  }
  const feedConfig = feed.config; // FeedConfig is nested under 'config' property

  // Get approved submissions for this feed
  const submissions = await feedRepository.getSubmissionsByFeed(feedId);
  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved",
  );

  if (approvedSubmissions.length === 0) {
    return c.json({ processed: 0 });
  }

  // Process each submission through stream output
  let processed = 0;
  const usedDistributors = new Set<string>();

  if (!context.processorService) {
    throw serviceUnavailable("Processor");
  }

  // Get optional distributors filter from query params
  const distributorsParam = c.req.query("distributors");

  for (const submission of approvedSubmissions) {
    try {
      if (!feedConfig.outputs.stream || !feedConfig.outputs.stream.distribute) {
        continue;
      }

      // Create a copy of the stream config
      const streamConfig: StreamConfig = { ...feedConfig.outputs.stream };

      // If no distributors specified, use all available
      if (!distributorsParam) {
        // Track all distributors
        streamConfig.distribute!.forEach((d: DistributorConfig) =>
          usedDistributors.add(d.plugin),
        );
      } else {
        // Parse and validate requested distributors
        const requestedDistributors = distributorsParam
          .split(",")
          .map((d) => d.trim());
        const availableDistributors = streamConfig.distribute!.map(
          (d) => d.plugin,
        );

        // Filter to only valid distributors
        const validDistributors = requestedDistributors.filter((d) =>
          availableDistributors.includes(d),
        );

        // Log warnings for invalid distributors
        const invalidDistributors = requestedDistributors.filter(
          (d) => !availableDistributors.includes(d),
        );

        if (invalidDistributors.length > 0) {
          logger.warn(
            `Invalid distributor(s) specified: ${invalidDistributors.join(", ")}. ` +
              `Available distributors: ${availableDistributors.join(", ")}`,
          );
        }

        // If no valid distributors, skip distribution entirely
        if (validDistributors.length === 0) {
          logger.warn(
            "No valid distributors specified. Skipping distribution.",
          );
          continue; // Skip to the next submission
        } else {
          // Filter to only requested distributors
          streamConfig.distribute = streamConfig.distribute!.filter((d: any) =>
            validDistributors.includes(d.plugin),
          );

          // Track used distributors
          validDistributors.forEach((d) => usedDistributors.add(d));

          logger.info(
            `Processing submission ${submission.tweetId} with selected distributors: ${validDistributors.join(", ")}`,
          );
        }
      }

      await context.processorService.process(submission, streamConfig);
      processed++;
    } catch (error) {
      logger.error(`Error processing submission ${submission.tweetId}:`, error);
    }
  }

  return c.json({
    processed,
    distributors: Array.from(usedDistributors),
  });
});

export { feedsRoutes };
