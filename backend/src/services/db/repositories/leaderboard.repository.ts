import * as queries from "../queries";
import { executeOperation, withDatabaseErrorHandling } from "../transaction";

/**
 * Repository for leaderboard-related database operations.
 */
export class LeaderboardRepository {
  /**
   * Gets the leaderboard data.
   *
   * @param timeRange The time range for the leaderboard (default: "all")
   * @returns Array of leaderboard entries
   */
  async getLeaderboard(
    timeRange: string = "all",
  ): Promise<queries.LeaderboardEntry[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return queries.getLeaderboard(db, timeRange);
        }); // Read operation
      },
      { operationName: "get leaderboard" },
    );
  }
}

// Export a singleton instance
export const leaderboardRepository = new LeaderboardRepository();
