import {
  SubmissionFeed,
  SubmissionStatus,
  TwitterSubmission,
} from "../../../types/twitter";
import * as queries from "../queries";
import { executeOperation } from "../transaction";

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
    await executeOperation(async (db) => {
      await queries.upsertFeeds(db, feeds);
    }, true); // Write operation
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
    await executeOperation(async (db) => {
      await queries.saveSubmissionToFeed(db, submissionId, feedId, status);
    }, true); // Write operation
  }

  /**
   * Gets feeds by submission ID.
   *
   * @param submissionId The submission ID
   * @returns Array of submission feeds
   */
  async getFeedsBySubmission(submissionId: string): Promise<SubmissionFeed[]> {
    return await executeOperation(async (db) => {
      return await queries.getFeedsBySubmission(db, submissionId);
    }); // Read operation
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
    await executeOperation(async (db) => {
      await queries.removeFromSubmissionFeed(db, submissionId, feedId);
    }, true); // Write operation
  }

  /**
   * Gets submissions by feed ID.
   *
   * @param feedId The feed ID
   * @returns Array of submissions with status
   */
  async getSubmissionsByFeed(feedId: string): Promise<
    (TwitterSubmission & {
      status: SubmissionStatus;
      moderationResponseTweetId?: string;
    })[]
  > {
    return await executeOperation(async (db) => {
      return await queries.getSubmissionsByFeed(db, feedId);
    }); // Read operation
  }

  /**
   * Gets a feed plugin.
   *
   * @param feedId The feed ID
   * @param pluginId The plugin ID
   * @returns The feed plugin or undefined if not found
   */
  async getFeedPlugin(feedId: string, pluginId: string) {
    return await executeOperation(async (db) => {
      return await queries.getFeedPlugin(db, feedId, pluginId);
    }); // Read operation
  }

  /**
   * Upserts a feed plugin.
   *
   * @param feedId The feed ID
   * @param pluginId The plugin ID
   * @param config The plugin configuration
   */
  async upsertFeedPlugin(
    feedId: string,
    pluginId: string,
    config: Record<string, any>,
  ): Promise<void> {
    await executeOperation(async (db) => {
      await queries.upsertFeedPlugin(db, feedId, pluginId, config);
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
}

// Export a singleton instance
export const feedRepository = new FeedRepository();
