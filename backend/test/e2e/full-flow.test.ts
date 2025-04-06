import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import nock from "nock";
import {
  createMockCuratorTweet,
  createMockModeratorTweet,
  createMockTweet,
} from "../utils/test-data";
import {
  cleanupTestServer,
  mockTwitterSearchTimeline,
  setupTestServer,
} from "../utils/test-helpers";

describe("Full Flow E2E", () => {
  let apiClient;
  let server;

  beforeAll(async () => {
    // Initialize the server with a random port for testing
    const testSetup = await setupTestServer();
    server = testSetup.server;
    apiClient = testSetup.apiClient;
  });

  afterAll(async () => {
    await cleanupTestServer(server);
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();

    // Disable external network requests but allow localhost
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);
  });

  test("Full flow from submission to distribution", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    mockTwitterSearchTimeline([tweet, curatorTweet]);

    // Mock the moderator list
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [
          {
            userId: "moderator_id",
            username: "moderator",
          },
        ],
      });

    // Mock distribution service
    nock("http://localhost")
      .post("/api/distribution")
      .reply(200, { success: true });

    // Act - Submit tweet
    const submissionResponse = await apiClient.post(
      "/api/test/twitter/mention",
      {
        tweet: curatorTweet,
      },
    );

    // Assert submission
    expect(submissionResponse.status).toBe(200);

    // Verify the submission was created
    const submissionStatusResponse = await apiClient.get(
      `/api/submissions/single/${tweet.id}`,
    );
    expect(submissionStatusResponse.status).toBe(200);
    expect(submissionStatusResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "pending",
    });

    // Act - Approve submission
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "approve");
    const approvalResponse = await apiClient.post("/api/test/twitter/mention", {
      tweet: moderatorTweet,
    });

    // Assert approval
    expect(approvalResponse.status).toBe(200);

    // Verify the submission was approved
    const approvedSubmissionResponse = await apiClient.get(
      `/api/submissions/single/${tweet.id}`,
    );
    expect(approvedSubmissionResponse.status).toBe(200);
    expect(approvedSubmissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "approved",
    });

    // Verify distribution was called
    expect(nock.isDone()).toBe(true);
  });

  test("Recap generation and distribution flow", async () => {
    // Arrange - Create multiple approved submissions
    const tweets = [createMockTweet(), createMockTweet(), createMockTweet()];

    // Mock Twitter API for all tweets
    for (const tweet of tweets) {
      nock("https://api.twitter.com")
        .get(`/tweets/${tweet.id}`)
        .reply(200, tweet);

      // Submit and approve each tweet
      const curatorTweet = createMockCuratorTweet(tweet.id);

      await apiClient.post("/api/test/twitter/mention", {
        tweet: curatorTweet,
      });

      // Mock the moderator list
      nock("http://localhost")
        .get(/\/api\/feed\/.*\/moderators/)
        .reply(200, {
          moderators: [
            {
              userId: "moderator_id",
              username: "moderator",
            },
          ],
        });

      const moderatorTweet = createMockModeratorTweet(
        curatorTweet.id,
        "approve",
      );
      await apiClient.post("/api/test/twitter/mention", {
        tweet: moderatorTweet,
      });
    }

    // Mock distribution service for recap
    nock("http://localhost")
      .post("/api/distribution/recap")
      .reply(200, { success: true });

    // Act - Generate recap
    const recapResponse = await apiClient.post("/api/feed/test-feed/recap", {
      timeframe: "daily",
    });

    // Assert
    expect(recapResponse.status).toBe(200);

    // Verify distribution was called
    expect(nock.isDone()).toBe(true);
  });
});
