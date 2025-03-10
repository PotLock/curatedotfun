import { db } from "../../services/db";
import { HonoApp } from "../../types/app";
import { serviceUnavailable } from "../../utils/error";
import { logger } from "../../utils/logger";

// Create feed routes
const router = HonoApp();

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

  return c.json(await db.getSubmissionsByFeed(feedId));
});

/**
 * Process approved submissions for a feed
 */
router.post("/:feedId/process", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  // Get approved submissions for this feed
  const submissions = await db.getSubmissionsByFeed(feedId);
  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved",
  );

  if (approvedSubmissions.length === 0) {
    return c.json({ processed: 0 });
  }

  // Process each submission through stream output
  let processed = 0;
  if (!context.processorService) {
    throw serviceUnavailable("Processor");
  }

  for (const submission of approvedSubmissions) {
    try {
      if (feed.outputs.stream) {
        await context.processorService.process(submission, feed.outputs.stream);
        processed++;
      }
    } catch (error) {
      logger.error(`Error processing submission ${submission.tweetId}:`, error);
    }
  }

  return c.json({ processed });
});

export default router;
