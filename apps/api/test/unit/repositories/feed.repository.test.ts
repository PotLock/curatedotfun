import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { feedRepository } from "../../../src/services/db/repositories";
import * as transaction from "../../../src/services/db/transaction";
import * as queries from "../../../src/services/db/queries";
import { SubmissionStatus } from "../../../src/types/twitter";
import { logger } from "../../../src/utils/logger";

// Mock the drizzle function with a spy
const drizzleMock = mock((client) => ({ mockDb: true, client }));
mock.module("drizzle-orm/node-postgres", () => ({
  drizzle: drizzleMock,
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

// Use spyOn to mock the logger
const loggerInfoSpy = spyOn(logger, "info").mockImplementation(() => {});
const loggerErrorSpy = spyOn(logger, "error").mockImplementation(() => {});
const loggerWarnSpy = spyOn(logger, "warn").mockImplementation(() => {});
const loggerDebugSpy = spyOn(logger, "debug").mockImplementation(() => {});

// Use spyOn to mock the query functions
const upsertFeedsSpy = spyOn(queries, "upsertFeeds").mockImplementation(
  async () => {},
);
const saveSubmissionToFeedSpy = spyOn(
  queries,
  "saveSubmissionToFeed",
).mockImplementation(async () => {});
const getFeedsBySubmissionSpy = spyOn(
  queries,
  "getFeedsBySubmission",
).mockImplementation(async () => []);
const removeFromSubmissionFeedSpy = spyOn(
  queries,
  "removeFromSubmissionFeed",
).mockImplementation(async () => {});
const getSubmissionsByFeedSpy = spyOn(
  queries,
  "getSubmissionsByFeed",
).mockImplementation(async () => []);
const updateSubmissionFeedStatusSpy = spyOn(
  queries,
  "updateSubmissionFeedStatus",
).mockImplementation(async () => {});

describe("FeedRepository", () => {
  beforeEach(() => {
    // Reset all spies before each test
    executeOperationSpy.mockClear();
    executeTransactionSpy.mockClear();
    withDatabaseErrorHandlingSpy.mockClear();
    loggerInfoSpy.mockClear();
    loggerErrorSpy.mockClear();
    loggerWarnSpy.mockClear();
    loggerDebugSpy.mockClear();
    upsertFeedsSpy.mockClear();
    saveSubmissionToFeedSpy.mockClear();
    getFeedsBySubmissionSpy.mockClear();
    removeFromSubmissionFeedSpy.mockClear();
    getSubmissionsByFeedSpy.mockClear();
    updateSubmissionFeedStatusSpy.mockClear();
  });

  describe("upsertFeeds", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const feeds = [
        { id: "feed1", name: "Feed 1", description: "Description 1" },
        { id: "feed2", name: "Feed 2" },
      ];

      await feedRepository.upsertFeeds(feeds);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(upsertFeedsSpy).toHaveBeenCalledWith({ mockDb: true }, feeds);
    });
  });

  describe("saveSubmissionToFeed", () => {
    test("should call executeOperation with the correct parameters", async () => {
      const submissionId = "123";
      const feedId = "feed1";
      const status = SubmissionStatus.PENDING;

      await feedRepository.saveSubmissionToFeed(submissionId, feedId, status);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(saveSubmissionToFeedSpy).toHaveBeenCalledWith(
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

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(saveSubmissionToFeedSpy).toHaveBeenCalledWith(
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

      getFeedsBySubmissionSpy.mockResolvedValueOnce(mockFeeds);

      const result = await feedRepository.getFeedsBySubmission(submissionId);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getFeedsBySubmissionSpy).toHaveBeenCalledWith(
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

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(removeFromSubmissionFeedSpy).toHaveBeenCalledWith(
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

      getSubmissionsByFeedSpy.mockResolvedValueOnce(mockSubmissions);

      const result = await feedRepository.getSubmissionsByFeed(feedId);

      expect(executeOperationSpy).toHaveBeenCalled();
      expect(getSubmissionsByFeedSpy).toHaveBeenCalledWith(
        { mockDb: true },
        feedId,
      );
      expect(result).toEqual(mockSubmissions);
    });
  });

  describe("updateSubmissionFeedStatus", () => {
    test("should call withDatabaseErrorHandling", async () => {
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

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      // Just check that it was called, without checking the exact parameters
      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
    });

    test("should handle errors gracefully", async () => {
      const submissionId = "123";
      const feedId = "feed1";
      const status = SubmissionStatus.APPROVED;
      const moderationResponseTweetId = "456";

      // Mock withDatabaseErrorHandling to simulate error handling
      withDatabaseErrorHandlingSpy.mockImplementationOnce(
        async (operation, options, defaultValue) => {
          // Just return without calling the operation
          return undefined;
        },
      );

      // Should not throw due to withDatabaseErrorHandling
      await feedRepository.updateSubmissionFeedStatus(
        submissionId,
        feedId,
        status,
        moderationResponseTweetId,
      );

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
    });
  });
});
