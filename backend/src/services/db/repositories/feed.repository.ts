import { and, eq, sql } from "drizzle-orm";
import { FeedConfig } from "types/config.zod";
import { RecapState } from "../../../types/recap";
import {
  Submission,
  SubmissionFeed,
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../../../types/submission";
import * as queries from "../queries";
import {
  feedRecapsState,
  feeds,
  moderationHistory,
  submissionFeeds,
  submissions,
} from "../schema";
import { DB, InsertFeed, SelectFeed, UpdateFeed } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

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
  ): Promise<RecapState | null> {
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
  async getAllRecapStatesForFeed(feedId: string): Promise<RecapState[]> {
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
    stateData: {
      feedId: string;
      recapId: string;
      externalJobId: string;
      lastSuccessfulCompletion: Date | null;
      lastRunError: string | null;
    },
    txDb: DB,
  ): Promise<RecapState> {
    return withErrorHandling(
      async () => {
        const existing = await txDb
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
          const updated = await txDb
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
          const inserted = await txDb
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
      },
      { operationName: "upsertRecapState", additionalContext: { stateData } },
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
    submissionId: string,
    feedId: string,
    status: SubmissionStatus = SubmissionStatus.PENDING,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await queries.saveSubmissionToFeed(txDb, submissionId, feedId, status);
      },
      {
        operationName: "saveSubmissionToFeed",
        additionalContext: { submissionId, feedId, status },
      },
    );
  }

  /**
   * Gets feeds by submission ID.
   */
  async getFeedsBySubmission(submissionId: string): Promise<SubmissionFeed[]> {
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
   * Gets submissions by feed ID.
   */
  async getSubmissionsByFeed(feedId: string): Promise<Submission[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const results = await dbInstance
            .select({
              s: {
                tweetId: submissions.tweetId,
                userId: submissions.userId,
                username: submissions.username,
                content: submissions.content,
                curatorNotes: submissions.curatorNotes,
                curatorId: submissions.curatorId,
                curatorUsername: submissions.curatorUsername,
                curatorTweetId: submissions.curatorTweetId,
                createdAt: sql<string>`${submissions.createdAt}::text`,
                submittedAt: sql<string>`COALESCE(${submissions.submittedAt}::text, ${submissions.createdAt}::text)`,
              },
              sf: {
                status: submissionFeeds.status,
              },
              m: {
                tweetId: moderationHistory.tweetId,
                adminId: moderationHistory.adminId,
                action: moderationHistory.action,
                note: moderationHistory.note,
                createdAt: moderationHistory.createdAt,
                feedId: moderationHistory.feedId,
                moderationResponseTweetId:
                  submissionFeeds.moderationResponseTweetId,
              },
            })
            .from(submissions)
            .innerJoin(
              submissionFeeds,
              eq(submissions.tweetId, submissionFeeds.submissionId),
            )
            .leftJoin(
              moderationHistory,
              eq(submissions.tweetId, moderationHistory.tweetId),
            )
            .where(eq(submissionFeeds.feedId, feedId))
            .orderBy(moderationHistory.createdAt);

          // Group results by submission
          const submissionMap = new Map<string, SubmissionWithFeedData>();

          for (const result of results) {
            if (!submissionMap.has(result.s.tweetId)) {
              submissionMap.set(result.s.tweetId, {
                tweetId: result.s.tweetId,
                userId: result.s.userId,
                username: result.s.username,
                content: result.s.content,
                curatorNotes: result.s.curatorNotes,
                curatorId: result.s.curatorId,
                curatorUsername: result.s.curatorUsername,
                curatorTweetId: result.s.curatorTweetId,
                createdAt: new Date(result.s.createdAt),
                submittedAt: result.s.submittedAt
                  ? new Date(result.s.submittedAt)
                  : null,
                moderationHistory: [],
                status: result.sf.status,
                moderationResponseTweetId:
                  result.m?.moderationResponseTweetId ?? undefined,
              });
            }

            if (result.m && result.m.adminId !== null) {
              const submission = submissionMap.get(result.s.tweetId)!;
              submission.moderationHistory.push({
                tweetId: result.s.tweetId,
                feedId: result.m.feedId!,
                adminId: result.m.adminId!,
                action: result.m.action as "approve" | "reject",
                note: result.m.note,
                timestamp: result.m.createdAt!,
                moderationResponseTweetId:
                  result.m.moderationResponseTweetId ?? undefined,
              });
            }
          }

          return Array.from(submissionMap.values());
        }, this.db),
      {
        operationName: "getSubmissionsByFeed",
        additionalContext: { feedId },
      },
      [],
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
