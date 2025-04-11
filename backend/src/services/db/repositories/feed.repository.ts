import { drizzle } from "drizzle-orm/node-postgres";
import {
  Submission,
  SubmissionFeed,
  SubmissionStatus,
} from "../../../types/twitter";
import { logger } from "../../../utils/logger";
import * as queries from "../queries";
import {
  executeOperation,
  executeTransaction,
  withDatabaseErrorHandling,
} from "../transaction";

/**
 * Repository for feed-related database operations.
 */
export class FeedRepository {
  /**
   * Upserts feeds in the database.
   *
   * @param feeds Array of feeds to upsert
   */
  async upsertFeeds(
    feeds: { id: string; name: string; description?: string }[],
  ): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.upsertFeeds(db, feeds);
        }, true); // Write operation
      },
      {
        operationName: "upsert feeds",
        additionalContext: { feedCount: feeds.length },
      },
    );
  }

  /**
   * Saves a submission to a feed.
   *
   * @param submissionId The submission ID
   * @param feedId The feed ID
   * @param status The submission status
   */
  async saveSubmissionToFeed(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus = SubmissionStatus.PENDING,
  ): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.saveSubmissionToFeed(db, submissionId, feedId, status);
        }, true); // Write operation
      },
      {
        operationName: "save submission to feed",
        additionalContext: { submissionId, feedId, status },
      },
    );
  }

  /**
   * Gets feeds by submission ID.
   *
   * @param submissionId The submission ID
   * @returns Array of submission feeds
   */
  async getFeedsBySubmission(submissionId: string): Promise<SubmissionFeed[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getFeedsBySubmission(db, submissionId);
        }); // Read operation
      },
      {
        operationName: "get feeds by submission",
        additionalContext: { submissionId },
      },
      [], // Default empty array if operation fails
    );
  }

  /**
   * Removes a submission from a feed.
   *
   * @param submissionId The submission ID
   * @param feedId The feed ID
   */
  async removeFromSubmissionFeed(
    submissionId: string,
    feedId: string,
  ): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.removeFromSubmissionFeed(db, submissionId, feedId);
        }, true); // Write operation
      },
      {
        operationName: "remove from submission feed",
        additionalContext: { submissionId, feedId },
      },
    );
  }

  /**
   * Gets submissions by feed ID.
   *
   * @param feedId The feed ID
   * @returns Array of submissions with status
   */
  async getSubmissionsByFeed(feedId: string): Promise<Submission[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getSubmissionsByFeed(db, feedId);
        }); // Read operation
      },
      {
        operationName: "get submissions by feed",
        additionalContext: { feedId },
      },
      [], // Default empty array if operation fails
    );
  }

  /**
   * Updates the status of a submission in a feed.
   * This is the consolidated method for updating submission status.
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
    return withDatabaseErrorHandling(
      async () => {
        return await executeTransaction(async (client) => {
          const db = drizzle(client);
          await queries.updateSubmissionFeedStatus(
            db,
            submissionId,
            feedId,
            status,
            moderationResponseTweetId,
          );
        });
      },
      {
        operationName: "update submission feed status",
        additionalContext: { submissionId, feedId, status },
      },
    );
  }
}

// Export a singleton instance
export const feedRepository = new FeedRepository();
