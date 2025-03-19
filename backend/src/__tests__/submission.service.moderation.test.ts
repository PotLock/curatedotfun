import { Tweet } from "agent-twitter-client";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { SubmissionService } from "../services/submissions/submission.service";
import { AppConfig, PluginsConfig } from "../types/config";
import { SubmissionStatus } from "../types/twitter";
import { MockProcessorService } from "./mocks/processor-service.mock";
import { MockTwitterService } from "./mocks/twitter-service.mock";
import { mockDb, resetMockDb } from "./setup-test-env";

import "./setup-test-env";

describe("SubmissionService - Moderation", () => {
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

  it("should handle moderation responses for pending submissions", async () => {
    // Setup existing submission
    mockDb.getSubmissionByCuratorTweetId.mockReturnValue({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      curatorTweetId: TWEET_IDS.curator1_reply,
      content: "Original content",
      submittedAt: new Date().toISOString(),
    });

    mockDb.getFeedsBySubmission.mockReturnValue([
      {
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        status: SubmissionStatus.PENDING,
      },
    ]);

    // Admin approving submission
    const moderationTweet: Tweet = {
      id: TWEET_IDS.mod1_reply,
      text: "!approve",
      username: admin1.username,
      userId: admin1.id,
      inReplyToStatusId: TWEET_IDS.curator1_reply,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    mockTwitterService.addMockTweet(moderationTweet);
    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify moderation was processed
    expect(mockDb.updateSubmissionFeedStatus).toHaveBeenCalledWith(
      TWEET_IDS.original1_tweet,
      "test2",
      SubmissionStatus.APPROVED,
      TWEET_IDS.mod1_reply,
    );

    // Verify moderation history was saved
    expect(mockDb.saveModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        tweetId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        adminId: admin1.username,
        action: "approve",
        note: expect.any(String),
        timestamp: expect.any(Date),
      }),
    );

    // Verify processor was triggered
    expect(mockProcessorService.processedItems).toHaveLength(1);
    expect(mockProcessorService.processedItems[0].content).toMatchObject({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      content: "Original content",
    });
    expect(mockProcessorService.processedItems[0].config).toEqual(
      mockConfig.feeds[1].outputs.stream,
    );
  });

  it("should ignore moderation responses from non-moderators", async () => {
    // Setup existing submission
    mockDb.getSubmissionByCuratorTweetId.mockReturnValue({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      curatorTweetId: TWEET_IDS.curator1_reply,
      content: "Original content",
      submittedAt: new Date().toISOString(),
    });

    mockDb.getFeedsBySubmission.mockReturnValue([
      {
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        status: SubmissionStatus.PENDING,
      },
    ]);

    // Non-moderator trying to approve
    const moderationTweet: Tweet = {
      id: TWEET_IDS.mod1_reply,
      text: "!approve",
      username: "random_user",
      userId: "random_id",
      inReplyToStatusId: TWEET_IDS.curator1_reply,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    mockTwitterService.addMockTweet(moderationTweet);
    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify no moderation changes occurred
    expect(mockDb.updateSubmissionFeedStatus).not.toHaveBeenCalled();
    expect(mockProcessorService.processedItems).toHaveLength(0);
  });

  it("should handle rejection responses", async () => {
    // Setup existing submission
    mockDb.getSubmissionByCuratorTweetId.mockReturnValue({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      curatorTweetId: TWEET_IDS.curator1_reply,
      content: "Original content",
      submittedAt: new Date().toISOString(),
    });

    mockDb.getFeedsBySubmission.mockReturnValue([
      {
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        status: SubmissionStatus.PENDING,
      },
    ]);

    // Admin rejecting submission
    const moderationTweet: Tweet = {
      id: TWEET_IDS.mod1_reply,
      text: "!reject",
      userId: admin1.id,
      username: admin1.username,
      inReplyToStatusId: TWEET_IDS.curator1_reply,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    mockTwitterService.addMockTweet(moderationTweet);
    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify rejection was processed
    expect(mockDb.updateSubmissionFeedStatus).toHaveBeenCalledWith(
      TWEET_IDS.original1_tweet,
      "test2",
      SubmissionStatus.REJECTED,
      TWEET_IDS.mod1_reply,
    );

    // Verify moderation history was saved
    expect(mockDb.saveModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        tweetId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        adminId: admin1.username,
        action: "reject",
        note: expect.any(String),
        timestamp: expect.any(Date),
      }),
    );

    // Verify no processing occurred for rejected submission
    expect(mockProcessorService.processedItems).toHaveLength(0);
  });

  it("should ignore moderation of already moderated submissions", async () => {
    // Setup existing submission
    mockDb.getSubmissionByCuratorTweetId.mockReturnValue({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      curatorTweetId: TWEET_IDS.curator1_reply,
      content: "Original content",
      submittedAt: new Date().toISOString(),
    });

    // Mock that it's already approved in test2 feed
    mockDb.getFeedsBySubmission.mockReturnValue([
      {
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        status: SubmissionStatus.APPROVED,
        moderationResponseTweetId: TWEET_IDS.mod1_reply,
      },
    ]);

    // Another admin trying to reject already approved submission
    const moderationTweet: Tweet = {
      id: TWEET_IDS.mod2_reply,
      text: "!reject",
      username: admin1.username,
      userId: admin1.id,
      inReplyToStatusId: TWEET_IDS.curator1_reply,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    mockTwitterService.addMockTweet(moderationTweet);
    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify no moderation changes occurred
    expect(mockDb.updateSubmissionFeedStatus).not.toHaveBeenCalled();
    expect(mockProcessorService.processedItems).toHaveLength(0);
  });

  it("should use first moderation response when multiple moderators respond", async () => {
    // Setup existing submission
    mockDb.getSubmissionByCuratorTweetId.mockReturnValue({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      curatorTweetId: TWEET_IDS.curator1_reply,
      content: "Original content",
      submittedAt: new Date().toISOString(),
    });

    mockDb.getFeedsBySubmission.mockReturnValue([
      {
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        status: SubmissionStatus.PENDING,
      },
    ]);

    // First admin approving submission
    const firstModTweet: Tweet = {
      id: TWEET_IDS.mod1_reply,
      text: "!approve",
      username: admin1.username,
      userId: admin1.id,
      inReplyToStatusId: TWEET_IDS.curator1_reply,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    // Second admin trying to reject (should be ignored since first response wins)
    const secondModTweet: Tweet = {
      id: TWEET_IDS.mod2_reply,
      text: "!reject",
      username: curator1.username, // curator1 is also a moderator
      userId: curator1.id,
      inReplyToStatusId: TWEET_IDS.curator1_reply,
      timeParsed: new Date(),
      hashtags: [],
      mentions: [botAccount],
      photos: [],
      urls: [],
      videos: [],
      thread: [],
    };

    // Add both moderation tweets, order matters since first one should win
    mockTwitterService.addMockTweet(firstModTweet);
    mockTwitterService.addMockTweet(secondModTweet);

    await submissionService.startMentionsCheck();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify only first moderation was processed
    expect(mockDb.updateSubmissionFeedStatus).toHaveBeenCalledTimes(1);
    expect(mockDb.updateSubmissionFeedStatus).toHaveBeenCalledWith(
      TWEET_IDS.original1_tweet,
      "test2",
      SubmissionStatus.APPROVED,
      TWEET_IDS.mod1_reply,
    );

    // Verify only first moderation was saved to history
    expect(mockDb.saveModerationAction).toHaveBeenCalledTimes(1);
    expect(mockDb.saveModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        tweetId: TWEET_IDS.original1_tweet,
        feedId: "test2",
        adminId: admin1.username,
        action: "approve",
        note: expect.any(String),
        timestamp: expect.any(Date),
      }),
    );

    // Verify processor was triggered since first response was approval
    expect(mockProcessorService.processedItems).toHaveLength(1);
    expect(mockProcessorService.processedItems[0].content).toMatchObject({
      tweetId: TWEET_IDS.original1_tweet,
      userId: user1.id,
      username: user1.username,
      curatorId: curator1.id,
      curatorUsername: curator1.username,
      content: "Original content",
    });
    expect(mockProcessorService.processedItems[0].config).toEqual(
      mockConfig.feeds[1].outputs.stream,
    );
  });
});
