import {
  Moderation,
  Submission,
  SubmissionWithFeedData,
} from "../../../types/twitter";
import * as queries from "../queries";
import { executeOperation, withDatabaseErrorHandling } from "../transaction";

/**
 * Repository for submission-related database operations.
 */
export class SubmissionRepository {
  /**
   * Saves a Twitter submission to the database.
   *
   * @param submission The submission to save
   */
  async saveSubmission(submission: Submission): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.saveSubmission(db, submission);
        }, true); // Write operation
      },
      {
        operationName: "save submission",
        additionalContext: { tweetId: submission.tweetId },
      },
    );
  }

  /**
   * Saves a moderation action to the database.
   *
   * @param moderation The moderation action to save
   */
  async saveModerationAction(moderation: Moderation): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.saveModerationAction(db, moderation);
        }, true); // Write operation
      },
      {
        operationName: "save moderation action",
        additionalContext: {
          tweetId: moderation.tweetId,
          feedId: moderation.feedId,
          action: moderation.action,
        },
      },
    );
  }

  /**
   * Gets a submission by tweet ID along with its associated feeds.
   *
   * @param tweetId The tweet ID
   * @returns The submission with feeds or null if not found
   */
  async getSubmission(tweetId: string): Promise<Submission | null> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getSubmission(db, tweetId);
        });
      },
      {
        operationName: "get submission with feeds",
        additionalContext: { tweetId },
      },
      null, // Default value if operation fails
    );
  }

  /**
   * Gets a submission by curator tweet ID.
   *
   * @param curatorTweetId The curator tweet ID
   * @returns The submission or null if not found
   */
  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<Submission | null> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getSubmissionByCuratorTweetId(
            db,
            curatorTweetId,
          );
        }); // Read operation
      },
      {
        operationName: "get submission by curator tweet ID",
        additionalContext: { curatorTweetId },
      },
      null, // Default value if operation fails
    );
  }

  /**
   * Gets all submissions, optionally filtered by status.
   *
   * @param status Optional status filter
   * @returns Array of submissions with feed data
   */
  async getAllSubmissions(status?: string): Promise<SubmissionWithFeedData[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getAllSubmissions(db, status);
        }); // Read operation
      },
      {
        operationName: "get all submissions",
        additionalContext: status ? { status } : {},
      },
      [], // Default empty array if operation fails
    );
  }

  /**
   * Gets the daily submission count for a user.
   *
   * @param userId The user ID
   * @returns The daily submission count
   */
  async getDailySubmissionCount(userId: string): Promise<number> {
    return withDatabaseErrorHandling(
      async () => {
        // Clean up old entries first (write operation)
        await executeOperation(async (db) => {
          await queries.cleanupOldSubmissionCounts(db);
        }, true);

        // Then get the count (read operation)
        return await executeOperation(async (db) => {
          return await queries.getDailySubmissionCount(db, userId);
        });
      },
      {
        operationName: "get daily submission count",
        additionalContext: { userId },
      },
      0, // Default to 0 if operation fails
    );
  }

  /**
   * Increments the daily submission count for a user.
   *
   * @param userId The user ID
   */
  async incrementDailySubmissionCount(userId: string): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.incrementDailySubmissionCount(db, userId);
        }, true); // Write operation
      },
      {
        operationName: "increment daily submission count",
        additionalContext: { userId },
      },
    );
  }

  /**
   * Gets the total number of posts.
   *
   * @returns The total number of posts
   */
  async getPostsCount(): Promise<number> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getPostsCount(db);
        }); // Read operation
      },
      { operationName: "get posts count" },
      0, // Default value if operation fails
    );
  }

  /**
   * Gets the total number of curators.
   *
   * @returns The total number of curators
   */
  async getCuratorsCount(): Promise<number> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getCuratorsCount(db);
        }); // Read operation
      },
      { operationName: "get curators count" },
      0, // Default value if operation fails
    );
  }
}

// Export a singleton instance
export const submissionRepository = new SubmissionRepository();
