import { and, asc, count, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import * as schema from "../schema";
import {
  InsertSubmission,
  RichSubmission,
  SelectSubmission,
  SelectSubmissionFeed,
  SubmissionStatus,
} from "../schema";
import { SelectModerationHistory } from "../schema/moderation";
import type { DB } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

export interface PaginationMetadata {
  page?: number;
  limit?: number;
  totalCount: number;
  totalPages?: number;
  hasNextPage?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination?: PaginationMetadata;
}

/**
 * Repository for submission-related database operations.
 */
export class SubmissionRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Save a new submission to the database
   * @param submission The submission data to insert
   * @param txDb Optional transaction DB instance
   * @returns The created submission
   */
  async saveSubmission(
    submission: InsertSubmission,
    txDb?: DB,
  ): Promise<SelectSubmission> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .insert(schema.submissions)
            .values({
              tweetId: submission.tweetId,
              userId: submission.userId,
              username: submission.username,
              content: submission.content,
              curatorNotes: submission.curatorNotes,
              curatorId: submission.curatorId,
              curatorUsername: submission.curatorUsername,
              curatorTweetId: submission.curatorTweetId,
              submittedAt: submission.submittedAt,
            })
            .returning();
          if (result.length === 0) {
            throw new Error(
              "Failed to save submission: no record returned after insert.",
            );
          }
          return result[0] as SelectSubmission;
        }, dbToUse);
      },
      {
        operationName: "save submission",
        additionalContext: { tweetId: submission.tweetId },
      },
    );
  }

  async getSubmission(tweetId: string): Promise<RichSubmission | null> {
    return withErrorHandling(
      async () => {
        const result = await executeWithRetry(
          (retryDb) =>
            retryDb.query.submissions.findFirst({
              where: eq(schema.submissions.tweetId, tweetId),
              with: {
                moderationHistoryItems: {
                  orderBy: (mh, { asc }) => [asc(mh.createdAt)],
                },
                feedLinks: {
                  with: {
                    feed: { columns: { name: true, id: true } },
                  },
                },
              },
            }),
          this.db,
        );

        if (!result) {
          return null;
        }

        const richSubmissionData: RichSubmission = {
          tweetId: result.tweetId,
          userId: result.userId,
          username: result.username,
          curatorId: result.curatorId,
          curatorUsername: result.curatorUsername,
          curatorTweetId: result.curatorTweetId,
          content: result.content,
          curatorNotes: result.curatorNotes,
          submittedAt: result.submittedAt,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          feeds:
            result.feedLinks?.map(
              (fl) =>
                ({
                  submissionId: fl.submissionId,
                  feedId: fl.feedId,
                  status: fl.status,
                  createdAt: fl.createdAt,
                  updatedAt: fl.updatedAt,
                }) as SelectSubmissionFeed,
            ) || [],
          moderationHistory:
            result.moderationHistoryItems?.map(
              (mh) =>
                ({
                  id: mh.id,
                  submissionId: mh.submissionId,
                  feedId: mh.feedId,
                  moderatorAccountId: mh.moderatorAccountId,
                  moderatorAccountIdType: mh.moderatorAccountIdType,
                  source: mh.source,
                  action: mh.action,
                  note: mh.note,
                  createdAt: mh.createdAt,
                  updatedAt: mh.updatedAt,
                }) as SelectModerationHistory,
            ) || [],
        };
        return richSubmissionData;
      },
      {
        operationName: "get submission",
        additionalContext: { tweetId },
      },
      null,
    );
  }

  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<RichSubmission | null> {
    return withErrorHandling(
      async () => {
        const result = await executeWithRetry(
          (retryDb) =>
            retryDb.query.submissions.findFirst({
              where: eq(schema.submissions.curatorTweetId, curatorTweetId),
              with: {
                moderationHistoryItems: {
                  orderBy: (mh, { asc }) => [asc(mh.createdAt)],
                },
                feedLinks: {
                  with: {
                    feed: { columns: { name: true, id: true } },
                  },
                },
              },
            }),
          this.db,
        );

        if (!result) {
          return null;
        }

        const richSubmissionData: RichSubmission = {
          tweetId: result.tweetId,
          userId: result.userId,
          username: result.username,
          curatorId: result.curatorId,
          curatorUsername: result.curatorUsername,
          curatorTweetId: result.curatorTweetId,
          content: result.content,
          curatorNotes: result.curatorNotes,
          submittedAt: result.submittedAt,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          feeds:
            result.feedLinks?.map(
              (fl) =>
                ({
                  submissionId: fl.submissionId,
                  feedId: fl.feedId,
                  status: fl.status,
                  createdAt: fl.createdAt,
                  updatedAt: fl.updatedAt,
                }) as SelectSubmissionFeed,
            ) || [],
          moderationHistory:
            result.moderationHistoryItems?.map(
              (mh) =>
                ({
                  id: mh.id,
                  submissionId: mh.submissionId,
                  feedId: mh.feedId,
                  moderatorAccountId: mh.moderatorAccountId,
                  moderatorAccountIdType: mh.moderatorAccountIdType,
                  source: mh.source,
                  action: mh.action,
                  note: mh.note,
                  createdAt: mh.createdAt,
                  updatedAt: mh.updatedAt,
                }) as SelectModerationHistory,
            ) || [],
        };
        return richSubmissionData;
      },
      {
        operationName: "get submission by curator tweet ID",
        additionalContext: { curatorTweetId },
      },
      null,
    );
  }

  async getAllSubmissions(
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<RichSubmission>> {
    const isPaginated = typeof page === "number" && typeof limit === "number";
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const conditions: SQL[] = [];

          if (status) {
            conditions.push(
              sql`EXISTS (
                SELECT 1
                FROM ${schema.submissionFeeds} sf
                WHERE sf.submission_id = ${schema.submissions.tweetId} AND sf.status = ${status}
              )`,
            );
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

          const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined;

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
                orderBy: (mh, { asc }) => [asc(mh.createdAt)],
              },
              feedLinks: {
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

          const submissionsResult =
            await retryDb.query.submissions.findMany(queryOptions);

          const mappedItems = submissionsResult.map((item): RichSubmission => {
            // item type here should include moderationHistoryItems and feedLinks due to 'with'
            const typedItem = item as typeof item & {
              moderationHistoryItems?: SelectModerationHistory[];
              feedLinks?: (SelectSubmissionFeed & {
                feed?: { name: string; id: string };
              })[];
            };

            return {
              tweetId: typedItem.tweetId,
              userId: typedItem.userId,
              username: typedItem.username,
              curatorId: typedItem.curatorId,
              curatorUsername: typedItem.curatorUsername,
              curatorTweetId: typedItem.curatorTweetId,
              content: typedItem.content,
              curatorNotes: typedItem.curatorNotes,
              submittedAt: typedItem.submittedAt as Date,
              createdAt: typedItem.createdAt as Date,
              updatedAt: typedItem.updatedAt as Date | null,
              feeds:
                typedItem.feedLinks?.map(
                  (fl) =>
                    ({
                      submissionId: fl.submissionId,
                      feedId: fl.feedId,
                      status: fl.status,
                      createdAt: fl.createdAt,
                      updatedAt: fl.updatedAt,
                    }) as SelectSubmissionFeed,
                ) || [],
              moderationHistory:
                typedItem.moderationHistoryItems?.map(
                  (mh) =>
                    ({
                      id: mh.id,
                      submissionId: mh.submissionId,
                      feedId: mh.feedId,
                      moderatorAccountId: mh.moderatorAccountId,
                      moderatorAccountIdType: mh.moderatorAccountIdType,
                      source: mh.source,
                      action: mh.action,
                      note: mh.note,
                      createdAt: mh.createdAt,
                      updatedAt: mh.updatedAt,
                    }) as SelectModerationHistory,
                ) || [],
            };
          });

          if (isPaginated) {
            const totalCountResult = await retryDb
              .select({ value: count() })
              .from(schema.submissions)
              .where(whereClause);

            const totalCount = totalCountResult[0]?.value || 0;
            const totalPages = Math.ceil(totalCount / (limit! || 1));

            return {
              items: mappedItems,
              pagination: {
                page: page!,
                limit: limit!,
                totalCount,
                totalPages,
                hasNextPage: page! * limit! + mappedItems.length < totalCount,
              },
            };
          } else {
            return {
              items: mappedItems,
            };
          }
        }, this.db);
      },
      {
        operationName: "get all submissions",
        additionalContext: { status, sortOrder, q, page, limit },
      },
      {
        items: [],
        pagination: isPaginated
          ? {
              page: page!,
              limit: limit!,
              totalCount: 0,
              totalPages: 0,
              hasNextPage: false,
            }
          : undefined,
      } as PaginatedResponse<RichSubmission>,
    );
  }

  async getDailySubmissionCount(userId: string): Promise<number> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const results = await retryDb
            .select({ count: schema.submissionCounts.count })
            .from(schema.submissionCounts)
            .where(
              and(
                eq(schema.submissionCounts.userId, userId),
                eq(
                  sql`${schema.submissionCounts.lastResetDate}::date`,
                  sql`CURRENT_DATE`,
                ),
              ),
            );

          return results.length > 0 ? results[0].count : 0;
        }, this.db);
      },
      {
        operationName: "get daily submission count",
        additionalContext: { userId },
      },
      0,
    );
  }

  /**
   * Clean up old submission counts
   * @param txDb Optional transaction DB instance
   */
  async cleanupOldSubmissionCounts(txDb?: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .delete(schema.submissionCounts)
            .where(
              sql`${schema.submissionCounts.lastResetDate}::date < CURRENT_DATE`,
            )
            .execute();
        }, dbToUse);
      },
      {
        operationName: "cleanup old submission counts",
      },
    );
  }

  /**
   * Increment the daily submission count for a user
   * @param userId The user ID
   * @param txDb Optional transaction DB instance
   */
  async incrementDailySubmissionCount(
    userId: string,
    txDb?: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .insert(schema.submissionCounts)
            .values({
              userId,
              count: 1,
              lastResetDate: sql`CURRENT_DATE`,
            })
            .onConflictDoUpdate({
              target: schema.submissionCounts.userId,
              set: {
                count: sql`CASE 
            WHEN ${schema.submissionCounts.lastResetDate}::date < CURRENT_DATE THEN 1
            ELSE ${schema.submissionCounts.count} + 1
          END`,
                lastResetDate: sql`CURRENT_DATE`,
              },
            })
            .execute();
        }, dbToUse);
      },
      {
        operationName: "increment daily submission count",
        additionalContext: { userId },
      },
    );
  }

  async getPostsCount(): Promise<number> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const result = await retryDb.execute(sql`
    SELECT COUNT(DISTINCT submission_id) as count
    FROM submission_feeds
    WHERE status = 'approved'
  `);

          return result.rows.length > 0 ? Number(result.rows[0].count) : 0;
        }, this.db);
      },
      { operationName: "get posts count" },
      0,
    );
  }

  async getCuratorsCount(): Promise<number> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const result = await retryDb.execute(sql`
    SELECT COUNT(DISTINCT curator_id) as count
    FROM submissions 
    WHERE curator_id IS NOT NULL
  `);

          return result.rows.length > 0 ? Number(result.rows[0].count) : 0;
        }, this.db);
      },
      { operationName: "get curators count" },
      0,
    );
  }
}
