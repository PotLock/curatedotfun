import { HonoApp } from "../../types/app";

// Create config routes
const router = HonoApp();

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
