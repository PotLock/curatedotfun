import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { leaderboardRepository } from "../../../src/services/db/repositories";
import * as transaction from "../../../src/services/db/transaction";
import * as queries from "../../../src/services/db/queries";

// Use spyOn to mock the transaction functions
const executeOperationSpy = spyOn(
  transaction,
  "executeOperation",
).mockImplementation(async (callback, isWrite = false) => {
  // Make sure to await the callback to ensure it's executed
  return await callback({ mockDb: true });
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
const getLeaderboardSpy = spyOn(queries, "getLeaderboard").mockImplementation(
  async () => [],
);

describe("LeaderboardRepository", () => {
  beforeEach(() => {
    // Reset all spies before each test
    executeOperationSpy.mockClear();
    withDatabaseErrorHandlingSpy.mockClear();
    getLeaderboardSpy.mockClear();
  });

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

      getLeaderboardSpy.mockResolvedValueOnce(mockLeaderboard);

      const result = await leaderboardRepository.getLeaderboard();

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(getLeaderboardSpy).toHaveBeenCalledWith({ mockDb: true }, "all");
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

      getLeaderboardSpy.mockResolvedValueOnce(mockLeaderboard);

      const result = await leaderboardRepository.getLeaderboard(timeRange);

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(getLeaderboardSpy).toHaveBeenCalledWith(
        { mockDb: true },
        timeRange,
      );
      expect(result).toEqual(mockLeaderboard);
    });

    test("should handle errors gracefully", async () => {
      const error = new Error("Database error");

      getLeaderboardSpy.mockRejectedValueOnce(error);

      // The withDatabaseErrorHandling function should rethrow the error
      // since no default value is provided
      await expect(leaderboardRepository.getLeaderboard()).rejects.toThrow(
        error,
      );

      expect(withDatabaseErrorHandlingSpy).toHaveBeenCalled();
      expect(getLeaderboardSpy).toHaveBeenCalledWith({ mockDb: true }, "all");
    });
  });
});
