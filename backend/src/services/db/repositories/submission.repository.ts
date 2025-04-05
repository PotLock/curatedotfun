import {
  Moderation,
  SubmissionFeed,
  SubmissionStatus,
  TwitterSubmission,
  TwitterSubmissionWithFeedData,
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
  async saveSubmission(submission: TwitterSubmission): Promise<void> {
    await executeOperation(async (db) => {
      await queries.saveSubmission(db, submission);
    }, true); // Write operation
  }

  /**
   * Saves a moderation action to the database.
   * 
   * @param moderation The moderation action to save
   */
  async saveModerationAction(moderation: Moderation): Promise<void> {
    await executeOperation(async (db) => {
      await queries.saveModerationAction(db, moderation);
    }, true); // Write operation
  }

  /**
   * Updates the status of a submission in a feed.
   * 
   * @param submissionId The submission ID
   * @param feedId The feed ID
   * @param status The new status
   * @param moderationResponseTweetId The moderation response tweet ID
   */
  async updateSubmissionFeedStatus(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus,
    moderationResponseTweetId: string,
  ): Promise<void> {
    await executeOperation(async (db) => {
      await queries.updateSubmissionFeedStatus(
        db,
        submissionId,
        feedId,
        status,
        moderationResponseTweetId,
      );
    }, true); // Write operation
  }

  /**
   * Gets a submission by tweet ID.
   * 
   * @param tweetId The tweet ID
   * @returns The submission or null if not found
   */
  async getSubmission(tweetId: string): Promise<TwitterSubmission | null> {
    return await executeOperation(async (db) => {
      return await queries.getSubmission(db, tweetId);
    }); // Read operation (default)
  }

  /**
   * Gets a submission by curator tweet ID.
   * 
   * @param curatorTweetId The curator tweet ID
   * @returns The submission or null if not found
   */
  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<TwitterSubmission | null> {
    return await executeOperation(async (db) => {
      return await queries.getSubmissionByCuratorTweetId(db, curatorTweetId);
    }); // Read operation
  }

  /**
   * Gets all submissions, optionally filtered by status.
   * 
   * @param status Optional status filter
   * @returns Array of submissions with feed data
   */
  async getAllSubmissions(
    status?: string,
  ): Promise<TwitterSubmissionWithFeedData[]> {
    return await executeOperation(async (db) => {
      return await queries.getAllSubmissions(db, status);
    }); // Read operation
  }

  /**
   * Gets the daily submission count for a user.
   * 
   * @param userId The user ID
   * @returns The daily submission count
   */
  async getDailySubmissionCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    // Clean up old entries first (write operation)
    await executeOperation(async (db) => {
      await queries.cleanupOldSubmissionCounts(db, today);
    }, true);

    // Then get the count (read operation)
    return await executeOperation(async (db) => {
      return await queries.getDailySubmissionCount(db, userId, today);
    });
  }

  /**
   * Increments the daily submission count for a user.
   * 
   * @param userId The user ID
   */
  async incrementDailySubmissionCount(userId: string): Promise<void> {
    await executeOperation(async (db) => {
      await queries.incrementDailySubmissionCount(db, userId);
    }, true); // Write operation
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
