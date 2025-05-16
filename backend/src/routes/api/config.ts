import { Hono } from "hono";
import { logger } from "../../utils/logger";
import { Env } from "types/app";

const router = new Hono<Env>();

/**
 * Reload the application configuration from disk
 */
router.post("/reload", async (c) => {
  try {
    const context = c.get("context");
    const config = await context.configService.loadConfig();

    // Reinitialize the submission service to update admin IDs and feeds
    if (context.submissionService) {
      await context.submissionService.initialize();
      logger.info(
        "Reinitialized submission service with updated configuration",
      );
    }

    return c.json({
      success: true,
      message: "Configuration reloaded successfully",
      config,
    });
  } catch (error) {
    return c.json(
      { success: false, message: `Failed to reload configuration: ${error}` },
      500,
    );
  }
});

/**
 * Get the full application configuration
 */
router.get("/", async (c) => {
  const context = c.get("context");
  const rawConfig = await context.configService.getRawConfig();
  return c.json(rawConfig);
});

/**
 * Get all feed configurations
 */
router.get("/feeds", async (c) => {
  const context = c.get("context");
  const rawConfig = await context.configService.getRawConfig();
  return c.json(rawConfig.feeds);
});

/**
 * Get configuration for a specific feed
 */
router.get("/:feedId", (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    c.notFound();
  }

  return c.json(feed);
});

export default router;
