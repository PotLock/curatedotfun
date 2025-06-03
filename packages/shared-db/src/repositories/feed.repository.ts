import { and, asc, count, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import * as queries from "../queries";
import {
  FeedConfig,
  feedRecapsState,
  feeds,
  moderationHistory,
  submissionFeeds,
  submissions,
  SubmissionStatus,
  submissionStatusZodEnum,
} from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import {
  DB,
  InsertFeed,
  InsertFeedRecapState,
  InsertSubmissionFeed,
  SelectFeed,
  SelectFeedRecapState,
  SelectModerationHistory,
  SelectSubmissionFeed,
  UpdateFeed,
} from "../validators";
import {
  BackendFeedStatus,
  PaginatedResponse,
  SubmissionWithFeedData,
} from "./submission.repository";

/**
 * Repository for feed-related database operations
 */
export class FeedRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get a feed by ID
   */
  async getFeedById(feedId: string): Promise<SelectFeed | null> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(feeds)
            .where(eq(feeds.id, feedId))
            .limit(1);
          return result.length > 0 ? (result[0] as SelectFeed) : null;
        }, this.db),
      { operationName: "getFeedById", additionalContext: { feedId } },
      null,
    );
  }

  /**
   * Get all feeds
   */
  async getAllFeeds(): Promise<SelectFeed[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance.select().from(feeds);
          return result as SelectFeed[];
        }, this.db),
      { operationName: "getAllFeeds" },
      [],
    );
  }

  /**
   * Create a new feed.
   */
  async createFeed(data: InsertFeed, txDb: DB): Promise<SelectFeed> {
    return withErrorHandling(
      async () => {
        const result = await txDb.insert(feeds).values(data).returning();
        return result[0] as SelectFeed;
      },
      { operationName: "createFeed", additionalContext: { data } },
    );
  }

  /**
   * Update an existing feed.
   */
  async updateFeed(
    feedId: string,
    data: UpdateFeed,
    txDb: DB,
  ): Promise<SelectFeed | null> {
    return withErrorHandling(
      async () => {
        // Reverted to idiomatic Drizzle: set({ ...data, ... })
        const result = await txDb
          .update(feeds)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(feeds.id, feedId))
          .returning();
        return result.length > 0 ? (result[0] as SelectFeed) : null;
      },
      { operationName: "updateFeed", additionalContext: { feedId, data } },
    );
  }

  /**
   * Delete a feed by ID.
   * This will also remove associated entries from submissionFeeds and feedRecapsState
   * due to foreign key constraints with ON DELETE CASCADE (assumed).
   * If ON DELETE CASCADE is not set, these would need to be deleted manually here.
   */
  async deleteFeed(feedId: string, txDb: DB): Promise<number> {
    return withErrorHandling(
      async () => {
        // First, delete related records if not handled by CASCADE
        // For example, delete from submissionFeeds
        await txDb
          .delete(submissionFeeds)
          .where(eq(submissionFeeds.feedId, feedId));

        // Then, delete from feedRecapsState
        await txDb
          .delete(feedRecapsState)
          .where(eq(feedRecapsState.feedId, feedId));
        
        // Finally, delete the feed itself
        const result = await txDb
          .delete(feeds)
          .where(eq(feeds.id, feedId))
          .returning({ id: feeds.id }); // Drizzle returns array of deleted objects
        return result.length; // Return the count of deleted feeds (should be 0 or 1)
      },
      { operationName: "deleteFeed", additionalContext: { feedId } },
    );
  }

  // --- Existing methods for feed config and recap state ---
  /**
   * Get a feed's configuration by ID
   */
  async getFeedConfig(feedId: string): Promise<FeedConfig | null> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select({ config: feeds.config })
            .from(feeds)
            .where(eq(feeds.id, feedId))
            .limit(1);
          return result.length > 0 ? result[0].config : null;
        }, this.db),
      { operationName: "getFeedConfig", additionalContext: { feedId } },
      null,
    );
  }

  /**
   * Get all feed configurations
   */
  async getAllFeedConfigs(): Promise<FeedConfig[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select({ config: feeds.config })
            .from(feeds);
          return result.map((row) => row.config);
        }, this.db),
      { operationName: "getAllFeedConfigs" },
      [],
    );
  }

  /**
   * Get a recap state by feed ID and recap ID
   */
  async getRecapState(
    feedId: string,
    recapId: string,
  ): Promise<SelectFeedRecapState | null> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
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
        }, this.db),
      {
        operationName: "getRecapState",
        additionalContext: { feedId, recapId },
      },
      null,
    );
  }

  /**
   * Get all recap states for a feed
   */
  async getAllRecapStatesForFeed(
    feedId: string,
  ): Promise<SelectFeedRecapState[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          return dbInstance
            .select()
            .from(feedRecapsState)
            .where(eq(feedRecapsState.feedId, feedId));
        }, this.db),
      {
        operationName: "getAllRecapStatesForFeed",
        additionalContext: { feedId },
      },
      [],
    );
  }

  /**
   * Create or update a recap state.
   */
  async upsertRecapState(
    data: InsertFeedRecapState,
    txDb: DB,
  ): Promise<SelectFeedRecapState> {
    return withErrorHandling(
      async () => {
        const existing = await txDb
          .select()
          .from(feedRecapsState)
          .where(
            and(
              eq(feedRecapsState.feedId, data.feedId),
              eq(feedRecapsState.recapId, data.recapId),
            ),
          )
          .limit(1);

        const now = new Date();

        if (existing.length > 0) {
          const updated = await txDb
            .update(feedRecapsState)
            .set({
              externalJobId: data.externalJobId,
              lastSuccessfulCompletion: data.lastSuccessfulCompletion,
              lastRunError: data.lastRunError,
              updatedAt: now,
            })
            .where(eq(feedRecapsState.id, existing[0].id))
            .returning();
          return updated[0];
        } else {
          const inserted = await txDb
            .insert(feedRecapsState)
            .values({
              feedId: data.feedId,
              recapId: data.recapId,
              externalJobId: data.externalJobId,
              lastSuccessfulCompletion: data.lastSuccessfulCompletion,
              lastRunError: data.lastRunError,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          return inserted[0];
        }
      },
      { operationName: "upsertRecapState", additionalContext: { data } },
    );
  }

  /**
   * Delete a recap state.
   */
  async deleteRecapState(
    feedId: string,
    recapId: string,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .delete(feedRecapsState)
          .where(
            and(
              eq(feedRecapsState.feedId, feedId),
              eq(feedRecapsState.recapId, recapId),
            ),
          );
      },
      {
        operationName: "deleteRecapState",
        additionalContext: { feedId, recapId },
      },
    );
  }

  /**
   * Delete all recap states for a feed.
   */
  async deleteRecapStatesForFeed(feedId: string, txDb: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .delete(feedRecapsState)
          .where(eq(feedRecapsState.feedId, feedId));
      },
      {
        operationName: "deleteRecapStatesForFeed",
        additionalContext: { feedId },
      },
    );
  }

  /**
   * Update the last successful completion timestamp for a recap.
   */
  async updateRecapCompletion(
    feedId: string,
    recapId: string,
    timestamp: Date,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
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
      },
      {
        operationName: "updateRecapCompletion",
        additionalContext: { feedId, recapId, timestamp },
      },
    );
  }

  /**
   * Update the error message for a recap.
   */
  async updateRecapError(
    feedId: string,
    recapId: string,
    errorMsg: string,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
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
      },
      {
        operationName: "updateRecapError",
        additionalContext: { feedId, recapId, errorMsg },
      },
    );
  }

  /**
   * Upserts feeds in the database.
   */
  async upsertFeeds(feedsToUpsert: FeedConfig[], txDb: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        // Assuming queries.upsertFeeds is designed to work with txDb
        await queries.upsertFeeds(txDb, feedsToUpsert);
      },
      {
        operationName: "upsertFeeds",
        additionalContext: { feedCount: feedsToUpsert.length },
      },
    );
  }

  /**
   * Saves a submission to a feed.
   */
  async saveSubmissionToFeed(
    data: InsertSubmissionFeed,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await queries.saveSubmissionToFeed(
          txDb,
          data.submissionId,
          data.feedId,
          data.status ?? submissionStatusZodEnum.Enum.pending,
        );
      },
      {
        operationName: "saveSubmissionToFeed",
        additionalContext: { data },
      },
    );
  }

  /**
   * Gets feeds by submission ID.
   */
  async getFeedsBySubmission(
    submissionId: string,
  ): Promise<SelectSubmissionFeed[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(
          (db) => queries.getFeedsBySubmission(db, submissionId),
          this.db,
        ),
      {
        operationName: "getFeedsBySubmission",
        additionalContext: { submissionId },
      },
      [],
    );
  }

  /**
   * Removes a submission from a feed.
   */
  async removeFromSubmissionFeed(
    submissionId: string,
    feedId: string,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await queries.removeFromSubmissionFeed(txDb, submissionId, feedId);
      },
      {
        operationName: "removeFromSubmissionFeed",
        additionalContext: { submissionId, feedId },
      },
    );
  }

  /**
   * Gets submissions by feed ID with pagination, filtering, and sorting.
   *
   * @param feedId The feed ID
   * @param page The page number (0-indexed)
   * @param limit The number of items per page
   * @param status Optional filter by submission status
   * @param sortOrder Optional sort order ("newest" or "oldest"), defaults to "newest"
   * @param q Optional search query for content, username, or curatorUsername
   * @returns Paginated array of submissions with feed data
   */
  async getSubmissionsByFeed(
    feedId: string,
    page: number,
    limit: number,
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
  ): Promise<PaginatedResponse<SubmissionWithFeedData>> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (retryDb) => {
          const conditions: SQL[] = [eq(submissionFeeds.feedId, feedId)];

          if (status) {
            conditions.push(eq(submissionFeeds.status, status));
          }

          if (q) {
            const searchQuery = `%${q}%`;
            conditions.push(
              or(
                ilike(submissions.content, searchQuery),
                ilike(submissions.username, searchQuery),
                ilike(submissions.curatorUsername, searchQuery),
              )!,
            );
          }

          const whereClause = and(...conditions);

          // Query for items
          const itemsQuery = retryDb
            .select({
              // Select fields from submissions table
              tweetId: submissions.tweetId,
              userId: submissions.userId,
              username: submissions.username,
              curatorId: submissions.curatorId,
              curatorUsername: submissions.curatorUsername,
              curatorTweetId: submissions.curatorTweetId,
              content: submissions.content,
              curatorNotes: submissions.curatorNotes,
              submittedAt: submissions.submittedAt,
              createdAt: submissions.createdAt,
              updatedAt: submissions.updatedAt,
              // Select status from submissionFeeds for this specific feed
              status: submissionFeeds.status,
              // Aggregate feedStatuses for all feeds the submission belongs to
              feedStatuses: sql<BackendFeedStatus[]>`(
                SELECT json_agg(json_build_object('feedId', sf_agg.feed_id, 'feedName', f_agg.name, 'status', sf_agg.status))
                FROM ${submissionFeeds} sf_agg
                JOIN ${feeds} f_agg ON sf_agg.feed_id = f_agg.id
                WHERE sf_agg.submission_id = ${submissions.tweetId}
              )`.as("feed_statuses"),
              // Aggregate moderationHistory
              moderationHistory: sql<SelectModerationHistory[]>`(
                SELECT json_agg(mh.*)
                FROM ${moderationHistory} mh
                WHERE mh.tweet_id = ${submissions.tweetId}
              )`.as("moderation_history"),
            })
            .from(submissions)
            .innerJoin(
              submissionFeeds,
              eq(submissions.tweetId, submissionFeeds.submissionId),
            )
            .where(whereClause)
            .orderBy(
              sortOrder === "newest"
                ? desc(submissions.submittedAt)
                : asc(submissions.submittedAt),
            )
            .groupBy(submissions.tweetId, submissionFeeds.status) // Group by necessary fields
            .limit(limit)
            .offset(page * limit);

          const submissionsResult = await itemsQuery;

          // Query for total count
          const totalCountSubQuery = retryDb
            .selectDistinct({ submissionId: submissions.tweetId })
            .from(submissions)
            .innerJoin(
              submissionFeeds,
              eq(submissions.tweetId, submissionFeeds.submissionId),
            )
            .where(whereClause);

          const totalCountQuery = retryDb
            .select({ value: count() })
            .from(totalCountSubQuery.as("distinct_submissions"));

          const totalCountResult = await totalCountQuery;
          const totalCountValue = totalCountResult[0]?.value || 0;
          const totalPages = Math.ceil(totalCountValue / limit);

          return {
            items: submissionsResult.map((item) => ({
              ...item,
              submittedAt: item.submittedAt,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              feedStatuses: item.feedStatuses || [],
              moderationHistory: item.moderationHistory || [],
            })) as SubmissionWithFeedData[],
            pagination: {
              page,
              limit,
              totalCount: totalCountValue,
              totalPages,
              hasNextPage: page < totalPages - 1,
            },
          };
        }, this.db),
      {
        operationName: "getSubmissionsByFeed (paginated)",
        additionalContext: { feedId, page, limit, status, sortOrder, q },
      },
      {
        // Default response on error
        items: [],
        pagination: {
          page, // page and limit are available in this scope
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
        },
      },
    );
  }

  /**
   * Updates the status of a submission in a feed.
   */
  async updateSubmissionFeedStatus(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus,
    moderationResponseTweetId: string | null,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await queries.updateSubmissionFeedStatus(
          txDb,
          submissionId,
          feedId,
          status,
          // @ts-expect-error need better update with moderation
          moderationResponseTweetId,
        );
      },
      {
        operationName: "updateSubmissionFeedStatus",
        additionalContext: { submissionId, feedId, status },
      },
    );
  }
}
