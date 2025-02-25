import { Tweet } from "agent-twitter-client";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { MockTwitterService } from "../__tests__/mocks/twitter-service.mock";

// Create a single mock instance to maintain state
const mockTwitterService = new MockTwitterService();

// Helper to create a tweet object
const createTweet = (
  id: string,
  text: string,
  username: string,
  inReplyToStatusId?: string,
  hashtags?: string[],
): Tweet => {
  return {
    id,
    text,
    username,
    userId: `mock-user-id-${username}`,
    timeParsed: new Date(),
    hashtags: hashtags ?? [],
    mentions: [],
    photos: [],
    urls: [],
    videos: [],
    thread: [],
    inReplyToStatusId,
  };
};

// Create test routes
const testRoutes = new Hono();

// Guard middleware for development only
testRoutes.use("*", async (c, next) => {
  console.log("env", process.env.NODE_ENV);
  if (process.env.NODE_ENV === "production") {
    return c.notFound();
  }
  await next();
});

// POST /api/test/tweets
testRoutes.post(
  "/tweets",
  zValidator("json", z.object({
    id: z.string(),
    inReplyToStatusId: z.string().optional(),
    text: z.string(),
    username: z.string(),
    timeParsed: z.string().optional(),
    userId: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
  })),
  async (c) => {
    const { id, text, username, inReplyToStatusId, hashtags } = c.req.valid("json");

    const tweet = createTweet(
      id,
      text,
      username,
      inReplyToStatusId,
      hashtags,
    );
    mockTwitterService.addMockTweet(tweet);
    return c.json(tweet);
  }
);

// POST /api/test/reset
testRoutes.post("/reset", (c) => {
  mockTwitterService.clearMockTweets();
  return c.json({ success: true });
});

// Export for use in tests and for replacing the real service
export { mockTwitterService, testRoutes };
