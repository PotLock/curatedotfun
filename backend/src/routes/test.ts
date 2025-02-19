import { Tweet } from "agent-twitter-client";
import { Elysia, t } from "elysia";
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

export const testRoutes = new Elysia({ prefix: "/api/test" })
  .guard({
    beforeHandle: () => {
      // Only allow in development and test environments
      if (process.env.NODE_ENV === "production") {
        return new Response("Not found", { status: 404 });
      }
    },
  })
  .post(
    "/tweets",
    async ({
      body,
    }: {
      body: {
        id: string;
        text: string;
        username: string;
        inReplyToStatusId?: string;
        hashtags?: string[];
      };
    }) => {
      const { id, text, username, inReplyToStatusId, hashtags } = body as {
        id: string;
        text: string;
        username: string;
        inReplyToStatusId?: string;
        hashtags?: string[];
      };

      const tweet = createTweet(
        id,
        text,
        username,
        inReplyToStatusId,
        hashtags,
      );
      mockTwitterService.addMockTweet(tweet);
      return tweet;
    },
    {
      body: t.Object({
        id: t.String(),
        text: t.String(),
        username: t.String(),
        inReplyToStatusId: t.Optional(t.String()),
        hashtags: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .post("/reset", () => {
    mockTwitterService.clearMockTweets();
    return { success: true };
  });

// Export for use in tests and for replacing the real service
export { mockTwitterService };
