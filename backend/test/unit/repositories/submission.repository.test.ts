import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { submissionRepository } from "../../../src/services/db/repositories";
import * as transaction from "../../../src/services/db/transaction";
import * as queries from "../../../src/services/db/queries";
import { SubmissionStatus, Submission } from "../../../src/types/twitter";

// Mock the drizzle function
mock.module("drizzle-orm/node-postgres", () => ({
  drizzle: (client) => ({ mockDb: true, client }),
}));

// Use spyOn to mock the transaction functions
const executeOperationSpy = spyOn(
  transaction,
  "executeOperation",
).mockImplementation(async (callback, isWrite = false) => {
  // Make sure to await the callback to ensure it's executed
  return await callback({ mockDb: true });
});

const executeTransactionSpy = spyOn(
  transaction,
  "executeTransaction",
).mockImplementation(async (callback) => {
  return await callback({ mockClient: true });
});

const withDatabaseErrorHandlingSpy = spyOn(
  transaction,
  "withDatabaseErrorHandling",
).mockImplementation(async (operation, options, defaultValue) => {
  try {
    // Just directly call the operation function and return its result
    return await operation();
  } catch (error) {
    // For error tests, return the default value if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
});

// Use spyOn to mock the query functions
const saveSubmissionSpy = spyOn(queries, "saveSubmission").mockImplementation(
  async () => {},
);
const saveModerationActionSpy = spyOn(
  queries,
  "saveModerationAction",
).mockImplementation(async () => {});
const updateSubmissionFeedStatusSpy = spyOn(
  queries,
  "updateSubmissionFeedStatus",
).mockImplementation(async () => {});
const getSubmissionSpy = spyOn(queries, "getSubmission").mockImplementation(
  async () => null,
);
const getSubmissionByCuratorTweetIdSpy = spyOn(
  queries,
  "getSubmissionByCuratorTweetId",
).mockImplementation(async () => null);
const getAllSubmissionsSpy = spyOn(
  queries,
  "getAllSubmissions",
).mockImplementation(async () => []);
const cleanupOldSubmissionCountsSpy = spyOn(
  queries,
  "cleanupOldSubmissionCounts",
).mockImplementation(async () => {});
const getDailySubmissionCountSpy = spyOn(
  queries,
  "getDailySubmissionCount",
).mockImplementation(async () => 0);
const incrementDailySubmissionCountSpy = spyOn(
  queries,
  "incrementDailySubmissionCount",
).mockImplementation(async () => {});
const getPostsCountSpy = spyOn(queries, "getPostsCount").mockImplementation(
  async () => 0,
);
const getCuratorsCountSpy = spyOn(
  queries,
  "getCuratorsCount",
).mockImplementation(async () => 0);

describe("SubmissionRepository", () => {
  beforeEach(() => {
    // Reset all spies before each test
    executeOperationSpy.mockClear();
    executeTransactionSpy.mockClear();
    withDatabaseErrorHandlingSpy.mockClear();
    saveSubmissionSpy.mockClear();
    saveModerationActionSpy.mockClear();
    updateSubmissionFeedStatusSpy.mockClear();
    getSubmissionSpy.mockClear();
    getSubmissionByCuratorTweetIdSpy.mockClear();
    getAllSubmissionsSpy.mockClear();
    cleanupOldSubmissionCountsSpy.mockClear();
    getDailySubmissionCountSpy.mockClear();
    incrementDailySubmissionCountSpy.mockClear();
    getPostsCountSpy.mockClear();
    getCuratorsCountSpy.mockClear();
  });

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

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(saveSubmissionSpy).toHaveBeenCalledWith(
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

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(saveModerationActionSpy).toHaveBeenCalledWith(
        { mockDb: true },
        moderation,
      );
    });
  });

  describe("getSubmission", () => {
    test("should return submission with feeds when found", async () => {
      const tweetId = "123";
      const mockFeeds = [
        {
          submissionId: tweetId,
          feedId: "feed1",
          status: SubmissionStatus.PENDING,
        },
        {
          submissionId: tweetId,
          feedId: "feed2",
          status: SubmissionStatus.APPROVED,
          moderationResponseTweetId: "789",
        },
      ];

      const mockSubmission: Submission = {
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
        feeds: mockFeeds,
      };

      getSubmissionSpy.mockResolvedValueOnce(mockSubmission);

      const result = await submissionRepository.getSubmission(tweetId);

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getSubmissionSpy).toHaveBeenCalledWith({ mockDb: true }, tweetId);
      expect(result).toEqual(mockSubmission);
    });

    test("should return null when submission not found", async () => {
      const tweetId = "123";

      getSubmissionSpy.mockResolvedValueOnce(null);

      const result = await submissionRepository.getSubmission(tweetId);

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getSubmissionSpy).toHaveBeenCalledWith({ mockDb: true }, tweetId);
      expect(result).toBeNull();
    });

    test("should handle database errors gracefully", async () => {
      const tweetId = "123";

      // Mock the executeOperation to throw an error
      executeOperationSpy.mockRejectedValueOnce(new Error("Database error"));

      const result = await submissionRepository.getSubmission(tweetId);

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("getSubmissionByCuratorTweetId", () => {
    test("should return submission with feeds when found", async () => {
      const curatorTweetId = "456";
      const mockFeeds = [
        {
          submissionId: "123",
          feedId: "feed1",
          status: SubmissionStatus.PENDING,
        },
        {
          submissionId: "123",
          feedId: "feed2",
          status: SubmissionStatus.APPROVED,
          moderationResponseTweetId: "789",
        },
      ];

      const mockSubmission: Submission = {
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
        feeds: mockFeeds,
      };

      // Set up the mock to return the mock submission
      getSubmissionByCuratorTweetIdSpy.mockResolvedValueOnce(mockSubmission);

      const result =
        await submissionRepository.getSubmissionByCuratorTweetId(
          curatorTweetId,
        );

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getSubmissionByCuratorTweetIdSpy).toHaveBeenCalledWith(
        { mockDb: true },
        curatorTweetId,
      );
      expect(result).toEqual(mockSubmission);
    });

    test("should return null when submission not found", async () => {
      const curatorTweetId = "456";

      // Set up the mock to return null
      getSubmissionByCuratorTweetIdSpy.mockResolvedValueOnce(null);

      const result =
        await submissionRepository.getSubmissionByCuratorTweetId(
          curatorTweetId,
        );

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getSubmissionByCuratorTweetIdSpy).toHaveBeenCalledWith(
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

      getAllSubmissionsSpy.mockResolvedValueOnce(mockSubmissions);

      const result = await submissionRepository.getAllSubmissions();

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getAllSubmissionsSpy).toHaveBeenCalledWith(
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

      getAllSubmissionsSpy.mockResolvedValueOnce(mockSubmissions);

      const result = await submissionRepository.getAllSubmissions(status);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getAllSubmissionsSpy).toHaveBeenCalledWith(
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

      getDailySubmissionCountSpy.mockResolvedValueOnce(count);

      const result = await submissionRepository.getDailySubmissionCount(userId);

      // Don't check the exact number of calls as it may vary
      expect(executeOperationSpy).toHaveBeenCalled();
      expect(cleanupOldSubmissionCountsSpy).toHaveBeenCalled();
      expect(getDailySubmissionCountSpy).toHaveBeenCalledWith(
        { mockDb: true },
        userId,
      );
      expect(result).toEqual(count);
    });
  });

  describe("incrementDailySubmissionCount", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const userId = "user1";

      await submissionRepository.incrementDailySubmissionCount(userId);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(incrementDailySubmissionCountSpy).toHaveBeenCalledWith(
        { mockDb: true },
        userId,
      );
    });
  });

  describe("getPostsCount", () => {
    test("should return posts count", async () => {
      const count = 10;

      getPostsCountSpy.mockResolvedValueOnce(count);

      const result = await submissionRepository.getPostsCount();

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(getPostsCountSpy).toHaveBeenCalledWith({ mockDb: true });
      expect(result).toEqual(count);
    });

    test("should return default value on error", async () => {
      // Set up the mock to throw an error
      getPostsCountSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const result = await submissionRepository.getPostsCount();

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(result).toEqual(0); // Default value
    });
  });

  describe("getCuratorsCount", () => {
    test("should return curators count", async () => {
      const count = 5;

      getCuratorsCountSpy.mockResolvedValueOnce(count);

      const result = await submissionRepository.getCuratorsCount();

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(getCuratorsCountSpy).toHaveBeenCalledWith({ mockDb: true });
      expect(result).toEqual(count);
    });

    test("should return default value on error", async () => {
      // Set up the mock to throw an error
      getCuratorsCountSpy.mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const result = await submissionRepository.getCuratorsCount();

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(result).toEqual(0); // Default value
    });
  });
});
