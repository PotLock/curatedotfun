import {
  afterAll,
  afterEach,
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

describe("Approval Flow", () => {
  let apiClient;
  let server;

  beforeAll(async () => {
    // Initialize the server with a random port for testing
    const testSetup = await setupTestServer();
    server = testSetup.server;
    apiClient = testSetup.apiClient;

    // Disable external network requests
    nock.disableNetConnect();
    nock.enableNetConnect(/(127\.0\.0\.1|localhost)/);
  });

  afterAll(async () => {
    await cleanupTestServer(server);
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("When a moderator approves a submission, it should be processed and distributed", async () => {
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

    // Create a moderator tweet for approval
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "approve");

    mockTwitterSearchTimeline([curatorTweet, moderatorTweet]);

    // Trigger the checkMentions method again to process the moderation
    await server.context.submissionService["checkMentions"]();

    // Verify the submission was approved
    const submissionResponse = await apiClient.get(
      `/api/submissions/single/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "approved",
    });
  });

  test("When a moderator rejects a submission, it should be marked as rejected", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    mockTwitterSearchTimeline([tweet, curatorTweet]);

    // Trigger the checkMentions method to process the submission
    await server.context.submissionService["checkMentions"]();

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

    // Create a moderator tweet for rejection
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "reject");

    // Trigger the checkMentions method again to process the moderation
    await server.context.submissionService["checkMentions"]();

    // Verify the submission was rejected
    const submissionResponse = await apiClient.get(
      `/api/submissions/single/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "rejected",
    });
  });

  test("When a non-moderator tries to approve a submission, it should be ignored", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    mockTwitterSearchTimeline([tweet, curatorTweet]);

    // Trigger the checkMentions method to process the submission
    await server.context.submissionService["checkMentions"]();

    // Mock the moderator list to return empty (non-moderator)
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [],
      });

    // Create a non-moderator tweet for approval
    const nonModeratorTweet = {
      ...createMockModeratorTweet(curatorTweet.id, "approve"),
      username: "non_moderator",
      userId: "non_moderator_id",
    };

    mockTwitterSearchTimeline([nonModeratorTweet]);

    // Trigger the checkMentions method again to process the non-moderator tweet
    await server.context.submissionService["checkMentions"]();

    // Verify the submission was not approved (still pending)
    const submissionResponse = await apiClient.get(
      `/api/submissions/single/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "pending", // Still pending, not approved
    });
  });
});
