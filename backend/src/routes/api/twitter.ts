import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HonoApp } from "../../types/app";
import { serviceUnavailable } from "../../utils/error";

// Create Twitter routes
const router = HonoApp();

/**
 * Get the last checked tweet ID
 */
router.get("/last-tweet-id", (c) => {
  const context = c.get("context");

  if (!context.twitterService) {
    throw serviceUnavailable("Twitter");
  }

  const lastTweetId = context.twitterService.getLastCheckedTweetId();
  return c.json({ lastTweetId });
});

/**
 * Set the last checked tweet ID
 */
router.post(
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
    await context.twitterService.setLastCheckedTweetId(tweetId);
    return c.json({ success: true });
  },
);

export default router;
