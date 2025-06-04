import { and, asc, count, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import * as queries from "../queries";
import * as schema from "../schema";
import {
  moderationHistory,
  submissionCounts,
  submissions,
  SubmissionStatus,
  submissionStatusZodEnum,
} from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import {
  DB,
  InsertModerationHistory,
  InsertSubmission,
  RichSubmission,
  SelectModerationHistory,
  SelectSubmissionFeed
} from "../validators";

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

export interface BackendFeedStatus {
  feedId: string;
  feedName: string;
  status: SubmissionStatus;
}

export interface SubmissionWithFeedData {
  tweetId: string;
  userId: string;
  username: string;
  curatorId: string | null;
  curatorUsername: string | null;
  curatorTweetId: string | null;
  content: string;
  curatorNotes: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
  feedStatuses: BackendFeedStatus[];
  moderationHistory: SelectModerationHistory[];
  status: SubmissionStatus;
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
   * Saves a Twitter submission to the database.
   * This method should be called within a service-managed transaction.
   *
   * @param submission The submission to save
   * @param txDb The transactional DB instance
   */
  async saveSubmission(submission: InsertSubmission, txDb: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .insert(submissions)
          .values({
            tweetId: submission.tweetId,
            userId: submission.userId,
            username: submission.username,
            content: submission.content,
            curatorNotes: submission.curatorNotes,
            curatorId: submission.curatorId,
            curatorUsername: submission.curatorUsername,
            curatorTweetId: submission.curatorTweetId,
            createdAt: submission.createdAt,
            submittedAt: submission.submittedAt,
          })
          .execute();
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
   * @param txDb The transactional DB instance
   */
  async saveModerationAction(
    moderation: InsertModerationHistory,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .insert(moderationHistory)
          .values({
            tweetId: moderation.tweetId,
            feedId: moderation.feedId,
            adminId: moderation.adminId,
            action: moderation.action,
            note: moderation.note,
            createdAt: moderation.createdAt,
          })
          .execute();
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
   * @returns The rich submission object with feeds and moderation history, or null if not found
   */
  async getSubmission(tweetId: string): Promise<RichSubmission | null> {
    return withErrorHandling(
      async () => {
        const baseSubmission = await executeWithRetry(
          (retryDb) => queries.getSubmission(retryDb, tweetId),
          this.db,
        );

        if (!baseSubmission) {
          return null;
        }

        const feeds: SelectSubmissionFeed[] = await executeWithRetry(
          (retryDb) => queries.getFeedsBySubmission(retryDb, tweetId),
          this.db,
        );

        const moderationHistory: SelectModerationHistory[] = await executeWithRetry(
          (retryDb) => queries.getModerationHistory(retryDb, tweetId),
          this.db,
        );

        return {
          ...baseSubmission,
          feeds,
          moderationHistory,
        };
      },
      {
        operationName: "get submission",
        additionalContext: { tweetId },
      },
      null,
    );
  }

  /**
   * Gets a submission by curator tweet ID, including its associated feeds and moderation history.
   *
   * @param curatorTweetId The curator tweet ID
   * @returns The rich submission object or null if not found
   */
  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<RichSubmission | null> {
    return withErrorHandling(
      async () => {
        const baseSubmission = await executeWithRetry(
          (retryDb) =>
            queries.getSubmissionByCuratorTweetId(retryDb, curatorTweetId),
          this.db,
        );

        if (!baseSubmission) {
          return null;
        }

        const feeds: SelectSubmissionFeed[] = await executeWithRetry(
          (retryDb) => queries.getFeedsBySubmission(retryDb, baseSubmission.tweetId),
          this.db,
        );

        const moderationHistory: SelectModerationHistory[] = await executeWithRetry(
          (retryDb) => queries.getModerationHistory(retryDb, baseSubmission.tweetId),
          this.db,
        );

        return {
          ...baseSubmission,
          feeds,
          moderationHistory,
        };
      },
      {
        operationName: "get submission by curator tweet ID",
        additionalContext: { curatorTweetId },
      },
      null,
    );
  }

  /**
   * Gets all submissions, optionally filtered by status, with pagination and search.
   *
   * @param page Page number (0-indexed)
   * @param limit Number of items per page
   * @param status Optional status filter
   * @param sortOrder Sort order ("newest" or "oldest")
   * @param q Optional search query for content, username, or curatorUsername
   * @returns Paginated array of submissions with feed data
   */
  async getAllSubmissions(
    page: number,
    limit: number,
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
  ): Promise<PaginatedResponse<SubmissionWithFeedData>> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const conditions: SQL[] = [];

          if (status) {
            const subquery = retryDb
              .select({ id: schema.submissionFeeds.submissionId })
              .from(schema.submissionFeeds)
              .where(
                and(
                  eq(
                    schema.submissionFeeds.submissionId,
                    schema.submissions.tweetId,
                  ),
                  eq(schema.submissionFeeds.status, status),
                ),
              )
              .limit(1);
            conditions.push(sql`exists ${subquery}`);
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

          // Query for items
          const itemsQuery = retryDb
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
              feedStatuses: sql<BackendFeedStatus[]>`(
                SELECT json_agg(json_build_object('feedId', sf.feed_id, 'feedName', f.name, 'status', sf.status))
                FROM ${schema.submissionFeeds} sf
                JOIN ${schema.feeds} f ON sf.feed_id = f.id
                WHERE sf.submission_id = ${schema.submissions.tweetId}
              )`.as("feed_statuses"),
              moderationHistory: sql<SelectModerationHistory[]>`(
                SELECT json_agg(mh.*)
                FROM ${schema.moderationHistory} mh
                WHERE mh.tweet_id = ${schema.submissions.tweetId}
              )`.as("moderation_history"),
            })
            .from(schema.submissions)
            .where(whereClause)
            .orderBy(
              sortOrder === "newest"
                ? desc(schema.submissions.submittedAt)
                : asc(schema.submissions.submittedAt),
            )
            .limit(limit)
            .offset(page * limit);

          const submissionsResult = await itemsQuery;

          // Query for total count
          const totalCountQuery = retryDb
            .select({ value: count() })
            .from(schema.submissions)
            .where(whereClause);

          const totalCountResult = await totalCountQuery;
          const totalCount = totalCountResult[0]?.value || 0;
          const totalPages = Math.ceil(totalCount / limit);

          return {
            items: submissionsResult.map((item) => ({
              ...item,
              status: status || submissionStatusZodEnum.Enum.pending,
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
        }, this.db);
      },
      {
        operationName: "get all submissions (paginated)",
        additionalContext: { page, limit, status, sortOrder, q },
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
      } as PaginatedResponse<SubmissionWithFeedData>,
    );
  }

  /**
   * Gets the daily submission count for a user.
   *
   * @param userId The user ID
   * @returns The daily submission count
   */
  async getDailySubmissionCount(userId: string): Promise<number> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const results = await retryDb
            .select({ count: submissionCounts.count })
            .from(submissionCounts)
            .where(
              and(
                eq(submissionCounts.userId, userId),
                eq(
                  sql`${submissionCounts.lastResetDate}::date`,
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
   * Cleans up old submission counts.
   * This method should be called within a service-managed transaction.
   * @param txDb The transactional DB instance
   */
  async cleanupOldSubmissionCounts(txDb: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .delete(submissionCounts)
          .where(sql`${submissionCounts.lastResetDate}::date < CURRENT_DATE`)
          .execute();
      },
      {
        operationName: "cleanup old submission counts",
      },
    );
  }

  /**
   * Increments the daily submission count for a user.
   *
   * @param userId The user ID
   * @param txDb The transactional DB instance
   */
  async incrementDailySubmissionCount(userId: string, txDb: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .insert(submissionCounts)
          .values({
            userId,
            count: 1,
            lastResetDate: sql`CURRENT_DATE`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: submissionCounts.userId,
            set: {
              count: sql`CASE 
          WHEN ${submissionCounts.lastResetDate}::date < CURRENT_DATE THEN 1
          ELSE ${submissionCounts.count} + 1
        END`,
              lastResetDate: sql`CURRENT_DATE`,
            },
          })
          .execute();
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
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          // Count approved submissions
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

  /**
   * Gets the total number of curators.
   *
   * @returns The total number of curators
   */
  async getCuratorsCount(): Promise<number> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          // Count unique curator IDs
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
