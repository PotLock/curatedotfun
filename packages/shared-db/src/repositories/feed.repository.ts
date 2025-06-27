import type { FeedConfig } from "@curatedotfun/types";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  or,
  sql,
  SQL,
} from "drizzle-orm";
import * as schema from "../schema";
import {
  InsertSubmissionFeed,
  RichSubmission,
  SelectSubmissionFeed,
  SubmissionStatus,
  submissionStatusZodEnum,
} from "../schema";
import type { InsertFeed, SelectFeed, UpdateFeed } from "../schema/feeds";
import { SelectModerationHistory } from "../schema/moderation";
import type { DB } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";
import { PaginatedResponse } from "./submission.repository";

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
  async findFeedById(feedId: string): Promise<SelectFeed | null> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance.query.feeds.findFirst({
            where: eq(schema.feeds.id, feedId),
          });
          return result ? (result as SelectFeed) : null;
        }, this.db);
      },
      { operationName: "findFeedById", additionalContext: { feedId } },
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
          const result = await dbInstance.select().from(schema.feeds);
          return result as SelectFeed[];
        }, this.db),
      { operationName: "getAllFeeds" },
      [],
    );
  }

  /**
   * Create a new feed.
   * @param data The feed data to insert
   * @param txDb Optional transaction DB instance
   * @returns The created feed
   */
  async createFeed(data: InsertFeed, txDb?: DB): Promise<SelectFeed> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .insert(schema.feeds)
            .values(data)
            .returning();
          if (result.length === 0) {
            throw new Error("Failed to create feed, no record returned.");
          }
          return result[0] as SelectFeed;
        }, dbToUse);
      },
      { operationName: "createFeed", additionalContext: { data } },
    );
  }

  /**
   * Update an existing feed.
   * @param feedId The feed ID
   * @param data The data to update
   * @param txDb Optional transaction DB instance
   * @returns The updated feed or null if not found
   */
  async updateFeed(
    feedId: string,
    data: UpdateFeed,
    txDb?: DB,
  ): Promise<SelectFeed | null> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .update(schema.feeds)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.feeds.id, feedId))
            .returning();
          return result.length > 0 ? (result[0] as SelectFeed) : null;
        }, dbToUse);
      },
      { operationName: "updateFeed", additionalContext: { feedId, data } },
    );
  }

  /**
   * Delete a feed by ID.
   * @param feedId The feed ID
   * @param txDb Optional transaction DB instance
   * @returns The deleted feed or null if not found
   */
  async deleteFeed(feedId: string, txDb?: DB): Promise<SelectFeed | null> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          return dbInstance.transaction(async (tx) => {
            // First, delete related entries in other tables
            await tx
              .delete(schema.submissionFeeds)
              .where(eq(schema.submissionFeeds.feedId, feedId));
            await tx
              .delete(schema.feedRecapsState)
              .where(eq(schema.feedRecapsState.feedId, feedId));

            // Now, delete the feed and return the deleted record
            const result = await tx
              .delete(schema.feeds)
              .where(eq(schema.feeds.id, feedId))
              .returning();

            return result.length > 0 ? (result[0] as SelectFeed) : null;
          });
        }, dbToUse);
      },
      { operationName: "deleteFeed", additionalContext: { feedId } },
      null,
    );
  }

  /**
   * Get a feed's configuration by ID
   */
  async getFeedConfig(feedId: string): Promise<FeedConfig | null> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select({ config: schema.feeds.config })
            .from(schema.feeds)
            .where(eq(schema.feeds.id, feedId))
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
            .select({ config: schema.feeds.config })
            .from(schema.feeds);
          return result.map((row) => row.config);
        }, this.db),
      { operationName: "getAllFeedConfigs" },
      [],
    );
  }

  // Recap related methods have been moved to FeedRecapRepository.ts

  /**
   * Save a submission to a feed
   * @param data The submission feed data
   * @param txDb Optional transaction DB instance
   * @returns The created submission feed
   */
  async saveSubmissionToFeed(
    data: InsertSubmissionFeed,
    txDb?: DB,
  ): Promise<SelectSubmissionFeed> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .insert(schema.submissionFeeds)
            .values({
              submissionId: data.submissionId,
              feedId: data.feedId,
              status: data.status ?? submissionStatusZodEnum.Enum.pending,
            })
            .returning();
          if (result.length === 0) {
            throw new Error(
              "Failed to save submission to feed, no record returned.",
            );
          }
          return result[0] as SelectSubmissionFeed;
        }, dbToUse);
      },
      {
        operationName: "saveSubmissionToFeed",
        additionalContext: { data },
      },
    );
  }

  async getFeedsBySubmission(
    submissionId: string,
  ): Promise<SelectSubmissionFeed[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const results = await dbInstance
            .select({
              submissionId: schema.submissionFeeds.submissionId,
              feedId: schema.submissionFeeds.feedId,
              status: schema.submissionFeeds.status,
              createdAt: schema.submissionFeeds.createdAt,
              updatedAt: schema.submissionFeeds.updatedAt,
            })
            .from(schema.submissionFeeds)
            .where(eq(schema.submissionFeeds.submissionId, submissionId));

          return results;
        }, this.db),
      {
        operationName: "getFeedsBySubmission",
        additionalContext: { submissionId },
      },
      [],
    );
  }

  /**
   * Remove a submission from a feed
   * @param submissionId The submission ID
   * @param feedId The feed ID
   * @param txDb Optional transaction DB instance
   */
  async removeFromSubmissionFeed(
    submissionId: string,
    feedId: string,
    txDb?: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .delete(schema.submissionFeeds)
            .where(
              and(
                eq(schema.submissionFeeds.submissionId, submissionId),
                eq(schema.submissionFeeds.feedId, feedId),
              ),
            )
            .execute();
        }, dbToUse);
      },
      {
        operationName: "removeFromSubmissionFeed",
        additionalContext: { submissionId, feedId },
      },
    );
  }

  /**
   * Gets submissions by feed ID with optional pagination, filtering, and sorting.
   */
  async getSubmissionsByFeed(
    feedId: string,
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
    pageInput?: number,
    limitInput?: number,
  ): Promise<PaginatedResponse<RichSubmission>> {
    const isPaginated =
      typeof pageInput === "number" &&
      pageInput >= 0 &&
      typeof limitInput === "number" &&
      limitInput > 0;

    const page = isPaginated ? pageInput : 0;
    const limit = isPaginated ? limitInput : 0;

    type SubmissionBase = typeof schema.submissions.$inferSelect;
    type ModerationHistoryItem = typeof schema.moderationHistory.$inferSelect;
    type FeedLinkItemBase = typeof schema.submissionFeeds.$inferSelect;

    type FeedLinkWithFeed = FeedLinkItemBase & {
      feed: { name: string; id: string };
    };

    type SubmissionWithRelations = SubmissionBase & {
      moderationHistoryItems: ModerationHistoryItem[];
      feedLinks: FeedLinkWithFeed[];
    };

    return withErrorHandling(
      async () =>
        executeWithRetry(async (retryDb) => {
          const conditions: SQL[] = [];

          conditions.push(
            exists(
              retryDb
                .select({ val: sql`1` })
                .from(schema.submissionFeeds)
                .where(
                  and(
                    eq(
                      schema.submissionFeeds.submissionId,
                      schema.submissions.tweetId,
                    ),
                    eq(schema.submissionFeeds.feedId, feedId),
                    status
                      ? eq(schema.submissionFeeds.status, status)
                      : undefined,
                  ),
                ),
            ),
          );

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

          const queryOptions: Parameters<
            typeof retryDb.query.submissions.findMany
          >[0] = {
            where: whereClause,
            orderBy:
              sortOrder === "newest"
                ? desc(schema.submissions.submittedAt)
                : asc(schema.submissions.submittedAt),
            with: {
              moderationHistoryItems: {
                where: eq(schema.moderationHistory.feedId, feedId),
                orderBy: (mh, { asc: ascFn }) => [ascFn(mh.createdAt)],
              },
              feedLinks: {
                where: eq(schema.submissionFeeds.feedId, feedId),
                with: {
                  feed: { columns: { name: true, id: true } },
                },
              },
            },
          };

          if (isPaginated) {
            queryOptions.limit = limit;
            queryOptions.offset = page * limit;
          }

          const submissionsResult = (await retryDb.query.submissions.findMany(
            queryOptions,
          )) as SubmissionWithRelations[];

          const totalCountResult = await retryDb
            .select({ value: count() })
            .from(schema.submissions)
            .where(whereClause);

          const totalCountValue = totalCountResult[0]?.value || 0;

          const items: RichSubmission[] = submissionsResult.map(
            (s: SubmissionWithRelations) => ({
              tweetId: s.tweetId,
              userId: s.userId,
              username: s.username,
              curatorId: s.curatorId,
              curatorUsername: s.curatorUsername,
              curatorTweetId: s.curatorTweetId,
              content: s.content,
              curatorNotes: s.curatorNotes,
              submittedAt: s.submittedAt,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
              feeds: (s.feedLinks || []).map((fl: FeedLinkWithFeed) => ({
                submissionId: fl.submissionId,
                feedId: fl.feedId,
                status: fl.status,
                createdAt: fl.createdAt,
                updatedAt: fl.updatedAt,
              })) as SelectSubmissionFeed[],
              moderationHistory: (s.moderationHistoryItems ||
                []) as SelectModerationHistory[],
            }),
          );

          const totalPages = isPaginated
            ? Math.ceil(totalCountValue / limit)
            : totalCountValue > 0
              ? 1
              : 0;

          return {
            items,
            pagination: {
              page,
              limit: isPaginated ? limit : totalCountValue,
              totalCount: totalCountValue,
              totalPages,
              hasNextPage: isPaginated ? page < totalPages - 1 : false,
            },
          };
        }, this.db),
      {
        operationName: "getSubmissionsByFeed",
        additionalContext: {
          feedId,
          status,
          sortOrder,
          q,
          pageInput,
          limitInput,
        },
      },
      {
        items: [],
        pagination: {
          page: typeof pageInput === "number" ? pageInput : 0,
          limit:
            typeof limitInput === "number" && limitInput > 0 ? limitInput : 0,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
        },
      },
    );
  }

  /**
   * Gets all submissions by feed ID, optionally filtered by status.
   * This method is intended for backend processing and does not include pagination.
   */
  async getAllSubmissionsByFeed(
    feedId: string,
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
  ): Promise<RichSubmission[]> {
    const result = await this.getSubmissionsByFeed(
      feedId,
      status,
      sortOrder,
      q,
      undefined,
      undefined,
    );
    return result.items;
  }

  /**
   * Updates the status of a submission in a feed.
   * @param submissionId The submission ID
   * @param feedId The feed ID
   * @param status The new status
   * @param txDb Optional transaction DB instance
   */
  async updateSubmissionFeedStatus(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus,
    txDb?: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .update(schema.submissionFeeds)
            .set({ status, updatedAt: new Date() })
            .where(
              and(
                eq(schema.submissionFeeds.submissionId, submissionId),
                eq(schema.submissionFeeds.feedId, feedId),
              ),
            );
        }, dbToUse);
      },
      {
        operationName: "updateSubmissionFeedStatus",
        additionalContext: {
          submissionId,
          feedId,
          status,
        },
      },
    );
  }
}
