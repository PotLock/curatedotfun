import { and, asc, count, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import { FeedConfig } from "../../../types/config";
import { RecapState } from "../../../types/recap";
import {
  Moderation,
  SubmissionFeed,
  FeedStatus as SubmissionFeedStatus,
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../../../types/twitter";
import { logger } from "../../../utils/logger";
import {
  InsertFeedData,
  SelectFeedData,
  UpdateFeedData,
} from "../../../validation/feed.validation";
import * as queries from "../queries";
import * as schema from "../schema";
import { feedRecapsState, feeds } from "../schema";
import {
  executeOperation,
  executeTransaction,
  withDatabaseErrorHandling,
} from "../transaction";

// TODO: move to common (copied from submission.repository.ts)
export interface PaginationMetadata {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}
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
  async getSubmissionsByFeed(
    feedId: string,
    page: number,
    limit: number,
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
  ): Promise<PaginatedResponse<SubmissionWithFeedData>> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          const conditions: SQL[] = [eq(schema.submissionFeeds.feedId, feedId)];

          if (status) {
            conditions.push(eq(schema.submissionFeeds.status, status));
          }

          if (q) {
            const searchQuery = `%${q}%`;
            conditions.push(
              or(
                ilike(schema.submissions.content, searchQuery),
                ilike(schema.submissions.username, searchQuery),
                ilike(schema.submissions.curatorUsername, searchQuery),
              )!,
            );
          }

          const whereClause = and(...conditions);

          // Query for items
          const itemsQuery = db
            .select({
              // Select fields from submissions table
              tweetId: schema.submissions.tweetId,
              userId: schema.submissions.userId,
              username: schema.submissions.username,
              curatorId: schema.submissions.curatorId,
              curatorUsername: schema.submissions.curatorUsername,
              curatorTweetId: schema.submissions.curatorTweetId,
              content: schema.submissions.content,
              curatorNotes: schema.submissions.curatorNotes,
              submittedAt: schema.submissions.submittedAt,
              createdAt: schema.submissions.createdAt,
              updatedAt: schema.submissions.updatedAt,
              // Select status from submissionFeeds for this specific feed
              status: schema.submissionFeeds.status,
              // Aggregate feedStatuses for all feeds the submission belongs to
              feedStatuses: sql<SubmissionFeedStatus[]>`(
                SELECT json_agg(json_build_object('feedId', sf_agg.feed_id, 'feedName', f_agg.name, 'status', sf_agg.status))
                FROM ${schema.submissionFeeds} sf_agg
                JOIN ${schema.feeds} f_agg ON sf_agg.feed_id = f_agg.id
                WHERE sf_agg.submission_id = ${schema.submissions.tweetId}
              )`.as("feed_statuses"),
              // Aggregate moderationHistory
              moderationHistory: sql<Moderation[]>`(
                SELECT json_agg(mh.*)
                FROM ${schema.moderationHistory} mh
                WHERE mh.tweet_id = ${schema.submissions.tweetId}
              )`.as("moderation_history"),
            })
            .from(schema.submissions)
            .innerJoin(
              schema.submissionFeeds,
              eq(
                schema.submissions.tweetId,
                schema.submissionFeeds.submissionId,
              ),
            )
            .where(whereClause)
            .orderBy(
              sortOrder === "newest"
                ? desc(schema.submissions.submittedAt)
                : asc(schema.submissions.submittedAt),
            )
            .groupBy(schema.submissions.tweetId, schema.submissionFeeds.status) // Group by necessary fields
            .limit(limit)
            .offset(page * limit);

          const submissionsResult = await itemsQuery;

          // Query for total count
          // For total count, we need to count distinct submissions matching the criteria
          const totalCountSubQuery = db
            .selectDistinct({ submissionId: schema.submissions.tweetId })
            .from(schema.submissions)
            .innerJoin(
              schema.submissionFeeds,
              eq(
                schema.submissions.tweetId,
                schema.submissionFeeds.submissionId,
              ),
            )
            .where(whereClause);

          const totalCountQuery = db
            .select({ value: count() })
            .from(totalCountSubQuery.as("distinct_submissions"));

          const totalCountResult = await totalCountQuery;
          const totalCount = totalCountResult[0]?.value || 0;
          const totalPages = Math.ceil(totalCount / limit);

          return {
            items: submissionsResult.map((item) => ({
              ...item,
              submittedAt: item.submittedAt,
              feedStatuses: item.feedStatuses || [],
              moderationHistory: item.moderationHistory || [],
            })) as SubmissionWithFeedData[],
            pagination: {
              page,
              limit,
              totalCount,
              totalPages,
              hasNextPage: page < totalPages - 1,
            },
          };
        });
      },
      {
        operationName: "getSubmissionsByFeed (paginated)",
        additionalContext: { feedId, page, limit, status, sortOrder, q },
      },
      {
        items: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
        },
      }, // Default on error
    );
  }

  /**
   * Gets all submissions for a specific feed, filtered by status, without pagination.
   * Used internally for processes like recaps or distributions.
   */
  async getAllSubmissionsForFeedByStatus(
    feedId: string,
    status: SubmissionStatus,
  ): Promise<SubmissionWithFeedData[]> {
    // Returns full SubmissionWithFeedData for consistency, though only core fields might be needed
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          const itemsQuery = db
            .select({
              tweetId: schema.submissions.tweetId,
              userId: schema.submissions.userId,
              username: schema.submissions.username,
              curatorId: schema.submissions.curatorId,
              curatorUsername: schema.submissions.curatorUsername,
              curatorTweetId: schema.submissions.curatorTweetId,
              content: schema.submissions.content,
              curatorNotes: schema.submissions.curatorNotes,
              submittedAt: schema.submissions.submittedAt,
              createdAt: schema.submissions.createdAt,
              updatedAt: schema.submissions.updatedAt,
              status: schema.submissionFeeds.status, // Status for this specific feed
              feedStatuses: sql<SubmissionFeedStatus[]>`(
                SELECT json_agg(json_build_object('feedId', sf_agg.feed_id, 'feedName', f_agg.name, 'status', sf_agg.status))
                FROM ${schema.submissionFeeds} sf_agg
                JOIN ${schema.feeds} f_agg ON sf_agg.feed_id = f_agg.id
                WHERE sf_agg.submission_id = ${schema.submissions.tweetId}
              )`.as("feed_statuses"),
              moderationHistory: sql<Moderation[]>`(
                SELECT json_agg(mh.*)
                FROM ${schema.moderationHistory} mh
                WHERE mh.tweet_id = ${schema.submissions.tweetId}
              )`.as("moderation_history"),
            })
            .from(schema.submissions)
            .innerJoin(
              schema.submissionFeeds,
              eq(
                schema.submissions.tweetId,
                schema.submissionFeeds.submissionId,
              ),
            )
            .where(
              and(
                eq(schema.submissionFeeds.feedId, feedId),
                eq(schema.submissionFeeds.status, status),
              ),
            )
            .orderBy(desc(schema.submissions.submittedAt)); // Default sort, can be removed if not needed for processing

          const results = await itemsQuery;
          return results.map((item) => ({
            ...item,
            submittedAt: item.submittedAt,
            feedStatuses: item.feedStatuses || [],
            moderationHistory: item.moderationHistory || [],
          })) as SubmissionWithFeedData[];
        });
      },
      {
        operationName: "getAllSubmissionsForFeedByStatus",
        additionalContext: { feedId, status },
      },
      [], // Default on error
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
