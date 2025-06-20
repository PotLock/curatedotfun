import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../../types/app";
import { serviceUnavailable } from "../../utils/error";
import { logger } from "../../utils/logger";

// Create Twitter routes
const twitterRoutes = new Hono<Env>();

/**
 * Get the last checked tweet ID
 */
twitterRoutes.get("/last-tweet-id", (c) => {
  const context = c.get("context");

  if (!context.twitterService) {
    throw serviceUnavailable("Twitter");
  }

  try {
    const lastTweetId = context.twitterService.getLastCheckedTweetId();
    return c.json({ lastTweetId });
  } catch (error) {
    logger.error(`Failed to get last tweet ID: ${error}`);
    return c.json(
      { success: false, message: "Failed to retrieve last tweet ID" },
      500,
    );
  }
});

/**
 * Set the last checked tweet ID
 */
twitterRoutes.post(
  "/last-tweet-id",
  zValidator(
    "json",
    z.object({
      tweetId: z.string().regex(/^\d+$/),
    }),
  ),
  async (c) => {
    const context = c.get("context");

    if (!context.twitterService) {
      throw serviceUnavailable("Twitter");
    }

    const { tweetId } = c.req.valid("json");
    try {
      context.twitterService.setLastCheckedTweetId(tweetId);
      return c.json({ success: true });
    } catch (error) {
      logger.error(`Failed to set last tweet ID: ${error}`);
      return c.json(
        { success: false, message: "Failed to update tweet ID" },
        500,
      );
    }
  },
);

export { twitterRoutes };
