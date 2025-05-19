import { and, desc, eq, sql } from "drizzle-orm";
import { FeedConfig } from "../../../types/config";
import { RecapState } from "../../../types/recap";
import {
  InsertFeedData,
  SelectFeedData,
  UpdateFeedData,
} from "../../../validation/feed.validation";
import {
  Submission,
  SubmissionFeed,
  SubmissionStatus,
} from "../../../types/twitter";
import { logger } from "../../../utils/logger";
import * as queries from "../queries";
import { feedRecapsState, feeds } from "../schema";
import {
  executeOperation,
  executeTransaction,
  withDatabaseErrorHandling,
} from "../transaction";

/**
 * Represents an approved submission for recap processing
 */
export interface ApprovedSubmission {
  submissionId: string;
  content: string;
  username: string;
  submittedAt: string;
  // Add other fields as needed
}

/**
 * Repository for feed-related database operations
 */
export class FeedRepository {
  /**
   * Get a feed by ID
   */
  async getFeedById(feedId: string): Promise<SelectFeedData | null> {
    return executeOperation(async (db) => {
      const result = await db
        .select()
        .from(feeds)
        .where(eq(feeds.id, feedId))
        .limit(1);
      return result.length > 0 ? (result[0] as SelectFeedData) : null;
    });
  }

  /**
   * Get all feeds
   */
  async getAllFeeds(): Promise<SelectFeedData[]> {
    return executeOperation(async (db) => {
      const result = await db.select().from(feeds);
      return result as SelectFeedData[];
    });
  }

  /**
   * Create a new feed
   */
  async createFeed(data: InsertFeedData): Promise<SelectFeedData> {
    return executeTransaction(async (db) => {
      const result = await db.insert(feeds).values(data).returning();
      return result[0] as SelectFeedData;
    }, true); // isWrite = true
  }

  /**
   * Update an existing feed
   */
  async updateFeed(
    feedId: string,
    data: UpdateFeedData,
  ): Promise<SelectFeedData | null> {
    return executeTransaction(async (db) => {
      const result = await db
        .update(feeds)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(feeds.id, feedId))
        .returning();
      return result.length > 0 ? (result[0] as SelectFeedData) : null;
    }, true); // isWrite = true
  }

  // --- Existing methods for feed config and recap state ---
  /**
   * Get a feed's configuration by ID
   */
  async getFeedConfig(feedId: string): Promise<FeedConfig | null> {
    return executeOperation(async (db) => {
      const result = await db
        .select({
          config: feeds.config,
        })
        .from(feeds)
        .where(eq(feeds.id, feedId))
        .limit(1);

      return result.length > 0 ? result[0].config : null;
    });
  }

  /**
   * Get all feed configurations
   */
  async getAllFeedConfigs(): Promise<FeedConfig[]> {
    return executeOperation(async (db) => {
      const result = await db
        .select({
          config: feeds.config,
        })
        .from(feeds);

      return result.map((row) => row.config);
    });
  }

  /**
   * Get a recap state by feed ID and recap ID
   */
  async getRecapState(
    feedId: string,
    recapId: string,
  ): Promise<RecapState | null> {
    return executeOperation(async (db) => {
      const result = await db
        .select()
        .from(feedRecapsState)
        .where(
          and(
            eq(feedRecapsState.feedId, feedId),
            eq(feedRecapsState.recapId, recapId),
          ),
        )
        .limit(1);

      return result.length > 0 ? result[0] : null;
    });
  }

  /**
   * Get all recap states for a feed
   */
  async getAllRecapStatesForFeed(feedId: string): Promise<RecapState[]> {
    return executeOperation(async (db) => {
      return db
        .select()
        .from(feedRecapsState)
        .where(eq(feedRecapsState.feedId, feedId));
    });
  }

  /**
   * Create or update a recap state
   */
  async upsertRecapState(stateData: {
    feedId: string;
    recapId: string;
    externalJobId: string;
    lastSuccessfulCompletion: Date | null;
    lastRunError: string | null;
  }): Promise<RecapState> {
    return executeTransaction(async (db) => {
      // Check if state exists
      const existing = await db
        .select()
        .from(feedRecapsState)
        .where(
          and(
            eq(feedRecapsState.feedId, stateData.feedId),
            eq(feedRecapsState.recapId, stateData.recapId),
          ),
        )
        .limit(1);

      const now = new Date();

      if (existing.length > 0) {
        // Update existing state
        const updated = await db
          .update(feedRecapsState)
          .set({
            externalJobId: stateData.externalJobId,
            lastSuccessfulCompletion: stateData.lastSuccessfulCompletion,
            lastRunError: stateData.lastRunError,
            updatedAt: now,
          })
          .where(eq(feedRecapsState.id, existing[0].id))
          .returning();

        return updated[0];
      } else {
        // Create new state
        const inserted = await db
          .insert(feedRecapsState)
          .values({
            feedId: stateData.feedId,
            recapId: stateData.recapId,
            externalJobId: stateData.externalJobId,
            lastSuccessfulCompletion: stateData.lastSuccessfulCompletion,
            lastRunError: stateData.lastRunError,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return inserted[0];
      }
    }, true); // isWrite = true
  }

  /**
   * Delete a recap state
   */
  async deleteRecapState(feedId: string, recapId: string): Promise<void> {
    await executeOperation(async (db) => {
      await db
        .delete(feedRecapsState)
        .where(
          and(
            eq(feedRecapsState.feedId, feedId),
            eq(feedRecapsState.recapId, recapId),
          ),
        );
    }, true); // isWrite = true
  }

  /**
   * Delete all recap states for a feed
   */
  async deleteRecapStatesForFeed(feedId: string): Promise<void> {
    await executeOperation(async (db) => {
      await db
        .delete(feedRecapsState)
        .where(eq(feedRecapsState.feedId, feedId));
    }, true); // isWrite = true
  }

  /**
   * Update the last successful completion timestamp for a recap
   */
  async updateRecapCompletion(
    feedId: string,
    recapId: string,
    timestamp: Date,
  ): Promise<void> {
    await executeOperation(async (db) => {
      await db
        .update(feedRecapsState)
        .set({
          lastSuccessfulCompletion: timestamp,
          lastRunError: null, // Clear any previous error
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(feedRecapsState.feedId, feedId),
            eq(feedRecapsState.recapId, recapId),
          ),
        );
    }, true); // isWrite = true
  }

  /**
   * Update the error message for a recap
   */
  async updateRecapError(
    feedId: string,
    recapId: string,
    errorMsg: string,
  ): Promise<void> {
    await executeOperation(async (db) => {
      await db
        .update(feedRecapsState)
        .set({
          lastRunError: errorMsg,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(feedRecapsState.feedId, feedId),
            eq(feedRecapsState.recapId, recapId),
          ),
        );
    }, true); // isWrite = true
  }

  /**
   * Get approved submissions since a specific date for a feed
   */
  async getApprovedSubmissionsSince(
    feedId: string,
    since: Date | null,
    limit: number = 100,
  ): Promise<ApprovedSubmission[]> {
    return executeOperation(async (db) => {
      // If no since date is provided, use a default lookback period (e.g., 7 days)
      const effectiveSince =
        since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      try {
        const results = await db
          .select({
            submissionId: sql<string>`submissions.tweet_id`,
            content: sql<string>`submissions.content`,
            username: sql<string>`submissions.username`,
            submittedAt: sql<string>`submissions.submitted_at`,
          })
          .from(sql`submissions`)
          .innerJoin(
            sql`submission_feeds`,
            sql`submissions.tweet_id = submission_feeds.submission_id`,
          )
          .where(
            sql`submission_feeds.feed_id = ${feedId} AND 
                submission_feeds.status = 'approved' AND 
                submissions.submitted_at >= ${effectiveSince.toISOString()}`,
          )
          .orderBy(desc(sql`submissions.submitted_at`))
          .limit(limit);

        return results as ApprovedSubmission[];
      } catch (error) {
        logger.error("Error fetching approved submissions:", error);
        return [];
      }
    });
  }

  /**
   * Upserts feeds in the database.
   *
   * @param feeds Array of feeds to upsert
   */
  async upsertFeeds(feeds: FeedConfig[]): Promise<void> {
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
        return await executeTransaction(async (db) => {
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
