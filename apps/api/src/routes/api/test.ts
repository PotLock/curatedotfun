import { MockTwitterService } from "@curatedotfun/core-services";
import { zValidator } from "@hono/zod-validator";
import { Tweet } from "agent-twitter-client";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../../types/app";

const testRoutes = new Hono<Env>();

// Guard middleware for development only
testRoutes.use("*", async (c, next) => {
  if (process.env.NODE_ENV === "production") {
    return c.notFound();
  }
  await next();
});

/**
 * Mock a tweet submission. This is a protected endpoint.
 */
testRoutes.post(
  "/mock-submission",
  zValidator(
    "json",
    z.object({
      text: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string(),
        username: z.string(),
      }),
    }),
  ),
  async (c) => {
    const sp = c.get("sp");
    const accountId = c.get("accountId");
    const twitterService = sp.getTwitterService();

    if (!accountId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { text, user } = c.req.valid("json");

    try {
      const mockTweet: Partial<Tweet> = {
        id: Date.now().toString(),
        text,
        username: user.username,
        userId: user.id,
      };

      if (twitterService instanceof MockTwitterService) {
        twitterService.addMockTweet(mockTweet);
        return c.json({ success: true, message: "Mock tweet submitted." });
      } else {
        return c.json(
          {
            success: false,
            message: "Mock submission only available in test environment.",
          },
          400,
        );
      }
    } catch (error) {
      c.var.sp.getLogger().error(`Failed to mock tweet submission: ${error}`);
      return c.json(
        { success: false, message: "Failed to mock tweet submission" },
        500,
      );
    }
  },
);

// POST /api/test/tweets
testRoutes.post(
  "/tweets",
  zValidator(
    "json",
    z.object({
      text: z.string(),
      username: z.string(),
      inReplyToStatusId: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
    }),
  ),
  async (c) => {
    const sp = c.get("sp");
    const twitterService = sp.getTwitterService();
    const { text, username, inReplyToStatusId, hashtags } = c.req.valid("json");

    if (twitterService instanceof MockTwitterService) {
      const tweet = twitterService.addMockTweet({
        text,
        username,
        inReplyToStatusId,
        hashtags,
      });
      return c.json(tweet);
    }
    return c.json({ error: "Not a mock service" }, 400);
  },
);

// POST /api/test/reset
testRoutes.post("/reset", (c) => {
  const sp = c.get("sp");
  const twitterService = sp.getTwitterService();
  if (twitterService instanceof MockTwitterService) {
    twitterService.clearMockTweets();
    return c.json({ success: true });
  }
  return c.json({ error: "Not a mock service" }, 400);
});

export { testRoutes };
