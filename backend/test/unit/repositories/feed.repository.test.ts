import { describe, test, expect, beforeEach, mock } from "bun:test";
import { feedRepository } from "../../../src/services/db/repositories";
import * as transaction from "../../../src/services/db/transaction";
import * as queries from "../../../src/services/db/queries";
import { SubmissionStatus } from "../../../src/types/twitter";

// Mock the transaction module
mock.module("../../../src/services/db/transaction", () => ({
  executeOperation: mock((callback, isWrite = false) =>
    callback({ mockDb: true }),
  ),
}));

// Mock the queries module
mock.module("../../../src/services/db/queries", () => ({
  upsertFeeds: mock(),
  saveSubmissionToFeed: mock(),
  getFeedsBySubmission: mock(),
  removeFromSubmissionFeed: mock(),
  getSubmissionsByFeed: mock(),
  updateSubmissionFeedStatus: mock(),
}));

describe("FeedRepository", () => {
  // No need for beforeEach reset as we're using fresh mocks for each test

  describe("upsertFeeds", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const feeds = [
        { id: "feed1", name: "Feed 1", description: "Description 1" },
        { id: "feed2", name: "Feed 2" },
      ];

      await feedRepository.upsertFeeds(feeds);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.upsertFeeds).toHaveBeenCalledWith({ mockDb: true }, feeds);
    });
  });

  describe("saveSubmissionToFeed", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const submissionId = "123";
      const feedId = "feed1";
      const status = SubmissionStatus.PENDING;

      await feedRepository.saveSubmissionToFeed(submissionId, feedId, status);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.saveSubmissionToFeed).toHaveBeenCalledWith(
        { mockDb: true },
        submissionId,
        feedId,
        status,
      );
    });

    test("should use default status if not provided", async () => {
      const submissionId = "123";
      const feedId = "feed1";

      await feedRepository.saveSubmissionToFeed(submissionId, feedId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.saveSubmissionToFeed).toHaveBeenCalledWith(
        { mockDb: true },
        submissionId,
        feedId,
        SubmissionStatus.PENDING,
      );
    });
  });

  describe("getFeedsBySubmission", () => {
    test("should return feeds for a submission", async () => {
      const submissionId = "123";
      const mockFeeds = [
        { submissionId, feedId: "feed1", status: SubmissionStatus.PENDING },
        {
          submissionId,
          feedId: "feed2",
          status: SubmissionStatus.APPROVED,
          moderationResponseTweetId: "456",
        },
      ];

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getFeedsBySubmission: mock().mockResolvedValue(mockFeeds),
      }));

      const result = await feedRepository.getFeedsBySubmission(submissionId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getFeedsBySubmission).toHaveBeenCalledWith(
        { mockDb: true },
        submissionId,
      );
      expect(result).toEqual(mockFeeds);
    });
  });

  describe("removeFromSubmissionFeed", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const submissionId = "123";
      const feedId = "feed1";

      await feedRepository.removeFromSubmissionFeed(submissionId, feedId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.removeFromSubmissionFeed).toHaveBeenCalledWith(
        { mockDb: true },
        submissionId,
        feedId,
      );
    });
  });

  describe("getSubmissionsByFeed", () => {
    test("should return submissions for a feed", async () => {
      const feedId = "feed1";
      const mockSubmissions = [
        {
          tweetId: "123",
          userId: "user1",
          username: "testuser",
          content: "Test content",
          curatorId: "curator1",
          curatorUsername: "curator",
          curatorTweetId: "456",
          createdAt: new Date(),
          submittedAt: new Date(),
          status: SubmissionStatus.PENDING,
          moderationHistory: [],
          curatorNotes: "Test notes",
        },
      ];

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getSubmissionsByFeed: mock().mockResolvedValue(mockSubmissions),
      }));

      const result = await feedRepository.getSubmissionsByFeed(feedId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getSubmissionsByFeed).toHaveBeenCalledWith(
        { mockDb: true },
        feedId,
      );
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe("updateSubmissionFeedStatus", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const submissionId = "123";
      const feedId = "feed1";
      const status = SubmissionStatus.APPROVED;
      const moderationResponseTweetId = "456";

      await feedRepository.updateSubmissionFeedStatus(
        submissionId,
        feedId,
        status,
        moderationResponseTweetId,
      );

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.updateSubmissionFeedStatus).toHaveBeenCalledWith(
        { mockDb: true },
        submissionId,
        feedId,
        status,
        moderationResponseTweetId,
      );
    });
  });
});
