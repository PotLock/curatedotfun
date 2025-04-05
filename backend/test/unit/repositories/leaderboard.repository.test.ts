import { describe, test, expect, beforeEach, mock } from "bun:test";
import { leaderboardRepository } from "../../../src/services/db/repositories/leaderboard.repository";
import * as transaction from "../../../src/services/db/transaction";
import * as queries from "../../../src/services/db/queries";

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
  getLeaderboard: mock(),
}));

describe("LeaderboardRepository", () => {
  // No need for beforeEach reset as we're using fresh mocks for each test

  describe("getLeaderboard", () => {
    test("should return leaderboard data with default timeRange", async () => {
      const mockLeaderboard = [
        {
          curatorId: "curator1",
          curatorUsername: "curator1",
          submissionCount: 10,
          approvalCount: 8,
          rejectionCount: 2,
          feedSubmissions: [
            { feedId: "feed1", count: 5, totalInFeed: 20 },
            { feedId: "feed2", count: 5, totalInFeed: 15 },
          ],
        },
        {
          curatorId: "curator2",
          curatorUsername: "curator2",
          submissionCount: 5,
          approvalCount: 4,
          rejectionCount: 1,
          feedSubmissions: [
            { feedId: "feed1", count: 3, totalInFeed: 20 },
            { feedId: "feed2", count: 2, totalInFeed: 15 },
          ],
        },
      ];

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getLeaderboard: mock().mockResolvedValue(mockLeaderboard),
      }));

      const result = await leaderboardRepository.getLeaderboard();

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(queries.getLeaderboard).toHaveBeenCalledWith(
        { mockDb: true },
        "all",
      );
      expect(result).toEqual(mockLeaderboard);
    });

    test("should return leaderboard data with specified timeRange", async () => {
      const timeRange = "month";
      const mockLeaderboard = [
        {
          curatorId: "curator1",
          curatorUsername: "curator1",
          submissionCount: 5,
          approvalCount: 4,
          rejectionCount: 1,
          feedSubmissions: [
            { feedId: "feed1", count: 3, totalInFeed: 10 },
            { feedId: "feed2", count: 2, totalInFeed: 8 },
          ],
        },
      ];

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getLeaderboard: mock().mockResolvedValue(mockLeaderboard),
      }));

      const result = await leaderboardRepository.getLeaderboard(timeRange);

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(queries.getLeaderboard).toHaveBeenCalledWith(
        { mockDb: true },
        timeRange,
      );
      expect(result).toEqual(mockLeaderboard);
    });

    test("should handle errors gracefully", async () => {
      const error = new Error("Database error");

      mock.module("../../../src/services/db/queries", () => ({
        ...queries,
        getLeaderboard: mock().mockRejectedValue(error),
      }));

      // The withDatabaseErrorHandling function should rethrow the error
      // since no default value is provided
      await expect(leaderboardRepository.getLeaderboard()).rejects.toThrow(
        error,
      );

      expect(transaction.withDatabaseErrorHandling).toHaveBeenCalled();
      expect(queries.getLeaderboard).toHaveBeenCalledWith(
        { mockDb: true },
        "all",
      );
    });
  });
});
