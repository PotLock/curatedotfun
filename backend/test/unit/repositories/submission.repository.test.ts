import { describe, test, expect, beforeEach, mock } from "bun:test";
import { submissionRepository } from "../../../src/services/db/repositories/submission.repository";
import * as transaction from "../../../src/services/db/transaction";
import * as queries from "../../../src/services/db/queries";
import { SubmissionStatus } from "../../../src/types/twitter";

// Mock the transaction module
mock.module("../../../src/services/db/transaction", () => ({
  executeOperation: mock((callback, isWrite = false) =>
    callback({ mockDb: true }),
  ),
  withDatabaseErrorHandling: mock(async (operation, options, defaultValue) => {
    try {
      return await operation();
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }),
}));

// Mock the queries module
mock.module("../../../src/services/db/queries", () => ({
  saveSubmission: mock(),
  saveModerationAction: mock(),
  updateSubmissionFeedStatus: mock(),
  getSubmission: mock(),
  getSubmissionByCuratorTweetId: mock(),
  getAllSubmissions: mock(),
  cleanupOldSubmissionCounts: mock(),
  getDailySubmissionCount: mock(),
  incrementDailySubmissionCount: mock(),
  getPostsCount: mock(),
  getCuratorsCount: mock(),
}));

describe("SubmissionRepository", () => {
  // No need for beforeEach reset as we're using fresh mocks for each test

  describe("saveSubmission", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const submission = {
        tweetId: "123",
        userId: "user1",
        username: "testuser",
        content: "Test content",
        curatorId: "curator1",
        curatorUsername: "curator",
        curatorTweetId: "456",
        createdAt: new Date(),
        submittedAt: new Date(),
        moderationHistory: [],
        curatorNotes: "Test notes",
      };

      await submissionRepository.saveSubmission(submission);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.saveSubmission).toHaveBeenCalledWith(
        { mockDb: true },
        submission,
      );
    });
  });

  describe("saveModerationAction", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const moderation = {
        tweetId: "123",
        feedId: "feed1",
        adminId: "admin1",
        action: "approve" as const,
        timestamp: new Date(),
        note: "Approved",
      };

      await submissionRepository.saveModerationAction(moderation);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.saveModerationAction).toHaveBeenCalledWith(
        { mockDb: true },
        moderation,
      );
    });
  });

  describe("getSubmission", () => {
    test("should return submission when found", async () => {
      const tweetId = "123";
      const mockSubmission = {
        tweetId,
        userId: "user1",
        username: "testuser",
        content: "Test content",
        curatorId: "curator1",
        curatorUsername: "curator",
        curatorTweetId: "456",
        createdAt: new Date(),
        submittedAt: new Date(),
        moderationHistory: [],
        curatorNotes: "Test notes",
      };

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getSubmission: mock().mockResolvedValue(mockSubmission),
      }));

      const result = await submissionRepository.getSubmission(tweetId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getSubmission).toHaveBeenCalledWith(
        { mockDb: true },
        tweetId,
      );
      expect(result).toEqual(mockSubmission);
    });

    test("should return null when submission not found", async () => {
      const tweetId = "123";

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getSubmission: mock().mockResolvedValue(null),
      }));

      const result = await submissionRepository.getSubmission(tweetId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getSubmission).toHaveBeenCalledWith(
        { mockDb: true },
        tweetId,
      );
      expect(result).toBeNull();
    });
  });

  describe("getSubmissionByCuratorTweetId", () => {
    test("should return submission when found", async () => {
      const curatorTweetId = "456";
      const mockSubmission = {
        tweetId: "123",
        userId: "user1",
        username: "testuser",
        content: "Test content",
        curatorId: "curator1",
        curatorUsername: "curator",
        curatorTweetId,
        createdAt: new Date(),
        submittedAt: new Date(),
        moderationHistory: [],
        curatorNotes: "Test notes",
      };

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getSubmissionByCuratorTweetId: mock().mockResolvedValue(mockSubmission),
      }));

      const result =
        await submissionRepository.getSubmissionByCuratorTweetId(
          curatorTweetId,
        );

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getSubmissionByCuratorTweetId).toHaveBeenCalledWith(
        { mockDb: true },
        curatorTweetId,
      );
      expect(result).toEqual(mockSubmission);
    });

    test("should return null when submission not found", async () => {
      const curatorTweetId = "456";

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getSubmissionByCuratorTweetId: mock().mockResolvedValue(null),
      }));

      const result =
        await submissionRepository.getSubmissionByCuratorTweetId(
          curatorTweetId,
        );

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getSubmissionByCuratorTweetId).toHaveBeenCalledWith(
        { mockDb: true },
        curatorTweetId,
      );
      expect(result).toBeNull();
    });
  });

  describe("getAllSubmissions", () => {
    test("should return all submissions", async () => {
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
          moderationHistory: [],
          status: SubmissionStatus.PENDING,
          feedStatuses: [],
        },
      ];

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getAllSubmissions: mock().mockResolvedValue(mockSubmissions),
      }));

      const result = await submissionRepository.getAllSubmissions();

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getAllSubmissions).toHaveBeenCalledWith(
        { mockDb: true },
        undefined,
      );
      expect(result).toEqual(mockSubmissions);
    });

    test("should filter submissions by status", async () => {
      const status = SubmissionStatus.APPROVED;
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
          moderationHistory: [],
          status: SubmissionStatus.APPROVED,
          feedStatuses: [],
        },
      ];

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getAllSubmissions: mock().mockResolvedValue(mockSubmissions),
      }));

      const result = await submissionRepository.getAllSubmissions(status);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.getAllSubmissions).toHaveBeenCalledWith(
        { mockDb: true },
        status,
      );
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe("getDailySubmissionCount", () => {
    test("should clean up old entries and return count", async () => {
      const userId = "user1";
      const count = 5;

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getDailySubmissionCount: mock().mockResolvedValue(count),
      }));

      const result = await submissionRepository.getDailySubmissionCount(userId);

      // Don't check the exact number of calls as it may vary
      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.cleanupOldSubmissionCounts).toHaveBeenCalled();
      expect(queries.getDailySubmissionCount).toHaveBeenCalledWith(
        { mockDb: true },
        userId,
        expect.any(String),
      );
      expect(result).toEqual(count);
    });
  });

  describe("incrementDailySubmissionCount", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const userId = "user1";

      await submissionRepository.incrementDailySubmissionCount(userId);

      expect(transaction.executeOperation).toHaveBeenCalled();
      expect(queries.incrementDailySubmissionCount).toHaveBeenCalledWith(
        { mockDb: true },
        userId,
      );
    });
  });

  describe("getPostsCount", () => {
    test("should return posts count", async () => {
      const count = 10;

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getPostsCount: mock().mockResolvedValue(count),
      }));

      const result = await submissionRepository.getPostsCount();

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(queries.getPostsCount).toHaveBeenCalledWith({ mockDb: true });
      expect(result).toEqual(count);
    });

    test("should return default value on error", async () => {
      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getPostsCount: mock().mockRejectedValue(new Error("Database error")),
      }));

      const result = await submissionRepository.getPostsCount();

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(result).toEqual(0); // Default value
    });
  });

  describe("getCuratorsCount", () => {
    test("should return curators count", async () => {
      const count = 5;

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getCuratorsCount: mock().mockResolvedValue(count),
      }));

      const result = await submissionRepository.getCuratorsCount();

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(queries.getCuratorsCount).toHaveBeenCalledWith({ mockDb: true });
      expect(result).toEqual(count);
    });

    test("should return default value on error", async () => {
      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getCuratorsCount: mock().mockRejectedValue(new Error("Database error")),
      }));

      const result = await submissionRepository.getCuratorsCount();

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(result).toEqual(0); // Default value
    });
  });
});
