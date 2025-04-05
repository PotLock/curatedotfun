import { feedRepository } from "../../services/db/repositories";
import { HonoApp } from "../../types/app";
import { serviceUnavailable } from "../../utils/error";
import { logger } from "../../utils/logger";

// Create feed routes
const router = HonoApp();

/**
 * Get all feeds
 */
router.get("/", async (c) => {
  const context = c.get("context");
  return c.json(context.configService.getConfig().feeds);
});

/**
 * Get submissions for a specific feed
 */
router.get("/:feedId", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  return c.json(await feedRepository.getSubmissionsByFeed(feedId));
});

/**
 * Process approved submissions for a feed
 * Optional query parameter: distributors - comma-separated list of distributor plugins to use
 * Example: /api/feed/solana/process?distributors=@curatedotfun/rss
 */
router.post("/:feedId/process", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

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
      if (!feed.outputs.stream || !feed.outputs.stream.distribute) {
        continue;
      }

      // Create a copy of the stream config
      const streamConfig = { ...feed.outputs.stream };

      // If no distributors specified, use all available
      if (!distributorsParam) {
        // Track all distributors
        streamConfig.distribute!.forEach((d) => usedDistributors.add(d.plugin));
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
          streamConfig.distribute = streamConfig.distribute!.filter((d) =>
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

export default router;
