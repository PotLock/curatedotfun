import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { SubmissionService } from "../services/submissions/submission.service";
import { AppConfig, PluginsConfig } from "../types/config";
import { SubmissionStatus } from "../types/twitter";
import { MockProcessorService } from "./mocks/processor-service.mock";
import { MockTwitterService } from "./mocks/twitter-service.mock";
import { mockDb, resetMockDb } from "./setup-test-env";

describe("SubmissionService - Basic", () => {
  let submissionService: SubmissionService;
  let mockTwitterService: MockTwitterService;
  let mockProcessorService: MockProcessorService;

  // Map readable IDs to realistic Twitter IDs
  const TWEET_IDS = {
    original1_tweet: "1881064853743579529",
    curator1_reply: "1881064853743579530",
    curator2_reply: "1881064853743579531",
    mod1_reply: "1881064853743579532",
    mod2_reply: "1881064853743579533",
  };

  const botAccount = { id: "test_bot_id", username: "test_bot" }; // bot
  const admin1 = { id: "admin1_id", username: "admin1" }; // moderator
  const curator1 = { id: "curator1_id", username: "curator1" }; // curator
  const curator2 = { id: "curator2_id", username: "curator2" }; // curator
  const user1 = { id: "user1_id", username: "user1" }; // submission tweet owner

  const mockConfig: AppConfig = {
    global: {
      botId: "test_bot",
      maxDailySubmissionsPerUser: 5,
      defaultStatus: SubmissionStatus.PENDING,
      blacklist: {
        twitter: ["blocked_user"],
      },
    },
    feeds: [
      {
        id: "test",
        name: "Test Feed",
        description: "Test feed for unit tests",
        moderation: {
          approvers: {
            twitter: [admin1.username, curator1.username],
          },
        },
        outputs: {
          stream: {
            enabled: true,
            distribute: [],
          },
        },
      },
      {
        id: "test2",
        name: "Test Feed 2",
        description: "Second test feed",
        moderation: {
          approvers: {
            twitter: [admin1.username],
          },
        },
        outputs: {
          stream: {
            enabled: true,
            distribute: [],
          },
        },
      },
    ],
    plugins: {} as PluginsConfig,
  };

  beforeEach(async () => {
    // Reset mock functions
    resetMockDb();

    // Create fresh instances
    mockTwitterService = new MockTwitterService();
    mockProcessorService = new MockProcessorService();
    submissionService = new SubmissionService(
      mockTwitterService as any,
      mockProcessorService as any,
      mockConfig,
    );

    // Replace the db reference in the SubmissionService with our mockDb
    (submissionService as any).db = mockDb;

    // Setup user IDs
    mockTwitterService.addMockUserId(admin1.username, admin1.id);
    mockTwitterService.addMockUserId(curator1.username, curator1.id);
    mockTwitterService.addMockUserId(curator2.username, curator2.id);
    mockTwitterService.addMockUserId(user1.username, user1.id);

    // Initialize service
    await submissionService.initialize();
  });

  afterEach(async () => {
    await submissionService.stop();
  });

  it("should initialize and stop correctly", async () => {
    // This test just verifies the setup and teardown work correctly
    expect(submissionService).toBeDefined();
  });

  it("should ignore submissions from blacklisted users", async () => {
    const originalTweet = {
      id: TWEET_IDS.original1_tweet,
      text: "Original content",
      username: user1.username,
      userId: user1.id,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    // Curator trying to submit blacklisted user's tweet
    const curatorTweet = {
      id: TWEET_IDS.curator1_reply,
      text: "@test_bot !submit #test",
      username: "blocked_user",
      userId: "blocked_id",
      inReplyToStatusId: TWEET_IDS.original1_tweet,
      timeParsed: new Date(),
      hashtags: ["test"],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    mockTwitterService.addMockTweet(originalTweet);
    mockTwitterService.addMockTweet(curatorTweet);

    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify no submission was created for blacklisted user
    expect(mockDb.saveSubmission).not.toHaveBeenCalled();
    expect(mockDb.saveSubmissionToFeed).not.toHaveBeenCalled();
    expect(mockProcessorService.processedItems).toHaveLength(0);
  });

  it("should ignore submissions to non-existent feeds", async () => {
    const originalTweet = {
      id: TWEET_IDS.original1_tweet,
      text: "Original content",
      username: user1.username,
      userId: user1.id,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    // Curator submitting to non-existent feed
    const curatorTweet = {
      id: TWEET_IDS.curator1_reply,
      text: "@test_bot !submit #nonexistent",
      username: curator1.username,
      userId: curator1.id,
      inReplyToStatusId: TWEET_IDS.original1_tweet,
      timeParsed: new Date(),
      hashtags: ["nonexistent"],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    mockTwitterService.addMockTweet(originalTweet);
    mockTwitterService.addMockTweet(curatorTweet);

    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify no submission was created
    expect(mockDb.saveSubmission).not.toHaveBeenCalled();
    expect(mockDb.saveSubmissionToFeed).not.toHaveBeenCalled();
    expect(mockProcessorService.processedItems).toHaveLength(0);
  });
});
