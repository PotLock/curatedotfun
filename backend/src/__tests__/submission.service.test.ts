import { Tweet } from "agent-twitter-client";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { SubmissionService } from "../services/submissions/submission.service";
import { AppConfig, PluginsConfig } from "../types/config";
import { SubmissionStatus } from "../types/twitter";
import { MockDistributionService } from "./mocks/distribution-service.mock";
import drizzleMock from "./mocks/drizzle.mock";
import { MockTwitterService } from "./mocks/twitter-service.mock";

describe("SubmissionService", () => {
  let submissionService: SubmissionService;
  let mockTwitterService: MockTwitterService;
  let mockDistributionService: MockDistributionService;

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
      {
        id: "DeSci",
        name: "DeSci Feed",
        description: "DeSci feed for testing",
        moderation: {
          approvers: {
            twitter: [curator1.username],
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
        id: "DAO",
        name: "DAO Feed",
        description: "DAO feed for testing",
        moderation: {
          approvers: {
            twitter: [curator1.username],
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
    // Reset drizzle mock
    Object.values(drizzleMock).forEach((mockFn) => mockFn.mockReset());

    // Create fresh instances
    mockTwitterService = new MockTwitterService();
    mockDistributionService = new MockDistributionService();
    submissionService = new SubmissionService(
      mockTwitterService as any,
      mockDistributionService as any,
      mockConfig,
    );

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

  describe("Curator Submissions", () => {
    it("should process curator submissions and auto-approve for feeds they moderate", async () => {
      // Original tweet being submitted
      const originalTweet: Tweet = {
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

      // Curator submitting to both feeds
      const curatorTweet: Tweet = {
        id: TWEET_IDS.curator1_reply,
        text: "@test_bot !submit #test #test2",
        username: curator1.username,
        userId: curator1.id,
        inReplyToStatusId: TWEET_IDS.original1_tweet,
        timeParsed: new Date(),
        hashtags: ["test", "test2"],
        mentions: [botAccount],
        photos: [],
        urls: [],
        videos: [],
        thread: [],
      };

      mockTwitterService.addMockTweet(originalTweet);
      mockTwitterService.addMockTweet(curatorTweet);

      // Process submission
      await submissionService.startMentionsCheck();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify submission was saved
      expect(drizzleMock.saveSubmission).toHaveBeenCalledTimes(1);
      const savedSubmission = drizzleMock.saveSubmission.mock.calls[0][0];
      expect(savedSubmission).toMatchObject({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: curator1.username,
        content: "Original content",
        createdAt: expect.any(String),
        submittedAt: expect.any(String),
        curatorNotes: expect.any(String),
      });

      // Verify feed submissions were saved
      expect(drizzleMock.saveSubmissionToFeed).toHaveBeenCalledTimes(2);

      // Both feeds should be saved as pending initially
      expect(drizzleMock.saveSubmissionToFeed.mock.calls[0]).toEqual([
        TWEET_IDS.original1_tweet,
        "test",
        SubmissionStatus.PENDING,
      ]);
      expect(drizzleMock.saveSubmissionToFeed.mock.calls[1]).toEqual([
        TWEET_IDS.original1_tweet,
        "test2",
        SubmissionStatus.PENDING,
      ]);

      // First feed (test) should be auto-approved since curator1 is a moderator
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "test",
        SubmissionStatus.APPROVED,
        TWEET_IDS.curator1_reply,
      );

      // Verify moderation history was saved for auto-approval
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "test",
          adminId: curator1.username,
          action: "approve",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );

      // Verify distribution was triggered for auto-approved feed
      expect(mockDistributionService.processedSubmissions).toHaveLength(1);
      expect(mockDistributionService.processedSubmissions[0]).toEqual({
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test",
      });
    });

    it("should handle moderation responses for pending submissions", async () => {
      // Setup existing submission
      drizzleMock.getSubmissionByCuratorTweetId.mockReturnValue({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: curator1.username,
        curatorTweetId: TWEET_IDS.curator1_reply,
        content: "Original content",
        submittedAt: new Date().toISOString(),
      });

      drizzleMock.getFeedsBySubmission.mockReturnValue([
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
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "test2",
        SubmissionStatus.APPROVED,
        TWEET_IDS.mod1_reply,
      );

      // Verify moderation history was saved
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "test2",
          adminId: admin1.username,
          action: "approve",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );

      // Verify distribution was triggered
      expect(mockDistributionService.processedSubmissions).toHaveLength(1);
      expect(mockDistributionService.processedSubmissions[0]).toEqual({
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
      });
    });

    it("should ignore moderation responses from non-moderators", async () => {
      // Setup existing submission
      drizzleMock.getSubmissionByCuratorTweetId.mockReturnValue({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: curator1.username,
        curatorTweetId: TWEET_IDS.curator1_reply,
        content: "Original content",
        submittedAt: new Date().toISOString(),
      });

      drizzleMock.getFeedsBySubmission.mockReturnValue([
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
      expect(drizzleMock.updateSubmissionFeedStatus).not.toHaveBeenCalled();
      expect(mockDistributionService.processedSubmissions).toHaveLength(0);
    });

    it("should handle resubmission of a tweet to different feeds", async () => {
      // Mock that the tweet was already submitted to test feed
      drizzleMock.getSubmission.mockReturnValue({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: curator1.username,
        curatorTweetId: TWEET_IDS.curator1_reply,
        content: "Original content",
        submittedAt: new Date().toISOString(),
      });

      // Mock that it's already in the test feed with approved status
      drizzleMock.getFeedsBySubmission.mockReturnValue([
        {
          submissionId: TWEET_IDS.original1_tweet,
          feedId: "test",
          status: SubmissionStatus.APPROVED,
          moderationResponseTweetId: TWEET_IDS.mod1_reply,
        },
      ]);

      const originalTweet: Tweet = {
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

      // New curator submitting to both test and test2 feeds
      const curatorTweet: Tweet = {
        id: TWEET_IDS.curator2_reply,
        text: "@test_bot !submit #test #test2",
        username: curator2.username,
        userId: curator2.id,
        inReplyToStatusId: TWEET_IDS.original1_tweet,
        timeParsed: new Date(),
        hashtags: ["test", "test2"],
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

      // Verify submission was not recreated but was added to test2 feed
      expect(drizzleMock.saveSubmission).not.toHaveBeenCalled();
      expect(drizzleMock.saveSubmissionToFeed).toHaveBeenCalledTimes(1);
      expect(drizzleMock.saveSubmissionToFeed.mock.calls[0]).toEqual([
        TWEET_IDS.original1_tweet,
        "test2",
        SubmissionStatus.PENDING,
      ]);

      // Verify no distribution occurred since the new submission is pending
      expect(mockDistributionService.processedSubmissions).toHaveLength(0);
    });

    it("should handle rejection responses", async () => {
      // Setup existing submission
      drizzleMock.getSubmissionByCuratorTweetId.mockReturnValue({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: curator1.username,
        curatorTweetId: TWEET_IDS.curator1_reply,
        content: "Original content",
        submittedAt: new Date().toISOString(),
      });

      drizzleMock.getFeedsBySubmission.mockReturnValue([
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
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "test2",
        SubmissionStatus.REJECTED,
        TWEET_IDS.mod1_reply,
      );

      // Verify moderation history was saved
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "test2",
          adminId: admin1.username,
          action: "reject",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );

      // Verify no distribution occurred for rejected submission
      expect(mockDistributionService.processedSubmissions).toHaveLength(0);
    });

    it("should auto-approve resubmission when curator is a moderator", async () => {
      // Mock that the tweet was already submitted by curator2 and is pending
      drizzleMock.getSubmission.mockReturnValue({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator2.id,
        curatorUsername: curator2.username,
        curatorTweetId: TWEET_IDS.curator2_reply,
        content: "Original content",
        submittedAt: new Date().toISOString(),
      });

      // Mock that it's pending in test feed from curator2's submission
      drizzleMock.getFeedsBySubmission.mockReturnValue([
        {
          submissionId: TWEET_IDS.original1_tweet,
          feedId: "test",
          status: SubmissionStatus.PENDING,
        },
      ]);

      const originalTweet: Tweet = {
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

      // Curator1 (who is a moderator) submitting to test feed
      const curatorTweet: Tweet = {
        id: TWEET_IDS.curator1_reply,
        text: "@test_bot !submit #test",
        username: curator1.username,
        userId: curator1.id,
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

      // Verify submission was not recreated
      expect(drizzleMock.saveSubmission).not.toHaveBeenCalled();

      // Verify feed submission was updated to approved since curator1 is a moderator
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "test",
        SubmissionStatus.APPROVED,
        TWEET_IDS.curator1_reply,
      );

      // Verify moderation history was saved
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "test",
          adminId: curator1.username,
          action: "approve",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );

      // Verify distribution was triggered since it was approved
      expect(mockDistributionService.processedSubmissions).toHaveLength(1);
      expect(mockDistributionService.processedSubmissions[0]).toEqual({
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test",
      });
    });

    it("should ignore submissions to non-existent feeds", async () => {
      const originalTweet: Tweet = {
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
      const curatorTweet: Tweet = {
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
      expect(drizzleMock.saveSubmission).not.toHaveBeenCalled();
      expect(drizzleMock.saveSubmissionToFeed).not.toHaveBeenCalled();
      expect(mockDistributionService.processedSubmissions).toHaveLength(0);
    });

    it("should ignore moderation of already moderated submissions", async () => {
      // Setup existing submission
      drizzleMock.getSubmissionByCuratorTweetId.mockReturnValue({
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
      drizzleMock.getFeedsBySubmission.mockReturnValue([
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
      expect(drizzleMock.updateSubmissionFeedStatus).not.toHaveBeenCalled();
      expect(mockDistributionService.processedSubmissions).toHaveLength(0);
    });

    it("should use first moderation response when multiple moderators respond", async () => {
      // Setup existing submission
      drizzleMock.getSubmissionByCuratorTweetId.mockReturnValue({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: curator1.username,
        curatorTweetId: TWEET_IDS.curator1_reply,
        content: "Original content",
        submittedAt: new Date().toISOString(),
      });

      drizzleMock.getFeedsBySubmission.mockReturnValue([
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
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledTimes(1);
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "test2",
        SubmissionStatus.APPROVED,
        TWEET_IDS.mod1_reply,
      );

      // Verify only first moderation was saved to history
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledTimes(1);
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "test2",
          adminId: admin1.username,
          action: "approve",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );

      // Verify distribution occurred since first response was approval
      expect(mockDistributionService.processedSubmissions).toHaveLength(1);
      expect(mockDistributionService.processedSubmissions[0]).toEqual({
        submissionId: TWEET_IDS.original1_tweet,
        feedId: "test2",
      });
    });

    it("should handle hashtags and moderator names case-insensitively", async () => {
      // Original tweet being submitted
      const originalTweet: Tweet = {
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

      // Curator submitting with differently cased hashtags
      const curatorTweet: Tweet = {
        id: TWEET_IDS.curator1_reply,
        text: "@test_bot !submit #DeSci #DAO",
        username: "CURATOR1", // Different case than config which has "curator1"
        userId: curator1.id,
        inReplyToStatusId: TWEET_IDS.original1_tweet,
        timeParsed: new Date(),
        hashtags: ["DeSci", "DAO"],
        mentions: [botAccount],
        photos: [],
        urls: [],
        videos: [],
        thread: [],
      };

      mockTwitterService.addMockTweet(originalTweet);
      mockTwitterService.addMockTweet(curatorTweet);

      // Process submission
      await submissionService.startMentionsCheck();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify submission was saved
      expect(drizzleMock.saveSubmission).toHaveBeenCalledTimes(1);
      const savedSubmission = drizzleMock.saveSubmission.mock.calls[0][0];
      expect(savedSubmission).toMatchObject({
        tweetId: TWEET_IDS.original1_tweet,
        userId: user1.id,
        username: user1.username,
        curatorId: curator1.id,
        curatorUsername: "CURATOR1",
        content: "Original content",
        createdAt: expect.any(String),
        submittedAt: expect.any(String),
        curatorNotes: expect.any(String),
      });

      // Verify feed submissions were saved with case-insensitive matching
      expect(drizzleMock.saveSubmissionToFeed).toHaveBeenCalledTimes(2);

      // Both feeds should be saved and auto-approved since curator1 is a moderator
      expect(drizzleMock.saveSubmissionToFeed.mock.calls[0]).toEqual([
        TWEET_IDS.original1_tweet,
        "DeSci", // Should match feed ID
        SubmissionStatus.PENDING,
      ]);
      expect(drizzleMock.saveSubmissionToFeed.mock.calls[1]).toEqual([
        TWEET_IDS.original1_tweet,
        "DAO", // Should match feed ID
        SubmissionStatus.PENDING,
      ]);

      // Verify both feeds were auto-approved despite case difference in moderator name
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledTimes(2);
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "DeSci",
        SubmissionStatus.APPROVED,
        TWEET_IDS.curator1_reply,
      );
      expect(drizzleMock.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        TWEET_IDS.original1_tweet,
        "DAO",
        SubmissionStatus.APPROVED,
        TWEET_IDS.curator1_reply,
      );

      // Verify moderation history was saved for both auto-approvals
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledTimes(2);
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "DeSci",
          adminId: "CURATOR1",
          action: "approve",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );
      expect(drizzleMock.saveModerationAction).toHaveBeenCalledWith(
        expect.objectContaining({
          tweetId: TWEET_IDS.original1_tweet,
          feedId: "DAO",
          adminId: "CURATOR1",
          action: "approve",
          note: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should ignore submissions from blacklisted users", async () => {
      const originalTweet: Tweet = {
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
      const curatorTweet: Tweet = {
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
      expect(drizzleMock.saveSubmission).not.toHaveBeenCalled();
      expect(drizzleMock.saveSubmissionToFeed).not.toHaveBeenCalled();
      expect(mockDistributionService.processedSubmissions).toHaveLength(0);
    });
  });
});
