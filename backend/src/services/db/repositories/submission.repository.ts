import { sql, eq, and, or, desc, asc, count, SQL, ilike } from "drizzle-orm";
import {
  Moderation,
  Submission,
  SubmissionWithFeedData,
  FeedStatus as SubmissionFeedStatus,
} from "../../../types/twitter";
import { SubmissionStatus } from "../schema";
import * as schema from "../schema";
import * as queries from "../queries";
import { executeOperation, withDatabaseErrorHandling } from "../transaction";

// TODO: move to common
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
 * Repository for submission-related database operations.
 */
export class SubmissionRepository {
  /**
   * Saves a Twitter submission to the database.
   *
   * @param submission The submission to save
   */
  async saveSubmission(submission: Submission): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.saveSubmission(db, submission);
        }, true); // Write operation
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
   */
  async saveModerationAction(moderation: Moderation): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.saveModerationAction(db, moderation);
        }, true); // Write operation
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
   * @returns The submission with feeds or null if not found
   */
  async getSubmission(tweetId: string): Promise<Submission | null> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getSubmission(db, tweetId);
        });
      },
      {
        operationName: "get submission with feeds",
        additionalContext: { tweetId },
      },
      null, // Default value if operation fails
    );
  }

  /**
   * Gets a submission by curator tweet ID.
   *
   * @param curatorTweetId The curator tweet ID
   * @returns The submission or null if not found
   */
  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<Submission | null> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          return await queries.getSubmissionByCuratorTweetId(
            db,
            curatorTweetId,
          );
        }); // Read operation
      },
      {
        operationName: "get submission by curator tweet ID",
        additionalContext: { curatorTweetId },
      },
      null, // Default value if operation fails
    );
  }

  /**
   * Gets all submissions, optionally filtered by status.
   *
   * @param status Optional status filter
   * @returns Array of submissions with feed data
   */
  async getAllSubmissions(
    page: number,
    limit: number,
    status?: SubmissionStatus,
    sortOrder: "newest" | "oldest" = "newest",
    q?: string,
  ): Promise<PaginatedResponse<SubmissionWithFeedData>> {
    return withDatabaseErrorHandling(
      async () => {
        return await executeOperation(async (db) => {
          const conditions: SQL[] = [];

          if (status) {
            const subquery = db
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
              feedStatuses: sql<SubmissionFeedStatus[]>`(
                SELECT json_agg(json_build_object('feedId', sf.feed_id, 'feedName', f.name, 'status', sf.status))
                FROM ${schema.submissionFeeds} sf
                JOIN ${schema.feeds} f ON sf.feed_id = f.id
                WHERE sf.submission_id = ${schema.submissions.tweetId}
              )`.as("feed_statuses"),
              moderationHistory: sql<Moderation[]>`(
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
          const totalCountQuery = db
            .select({ value: count() })
            .from(schema.submissions)
            .where(whereClause);

          const totalCountResult = await totalCountQuery;
          const totalCount = totalCountResult[0]?.value || 0;
          const totalPages = Math.ceil(totalCount / limit);

          return {
            items: submissionsResult.map((item) => ({
              ...item,
              status: status || schema.SubmissionStatus.PENDING,
              submittedAt:
                item.submittedAt instanceof Date
                  ? item.submittedAt.toISOString()
                  : item.submittedAt,
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
        operationName: "getAllSubmissions (paginated)",
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
      }, // Default on error
    );
  }

  /**
   * Gets the daily submission count for a user.
   *
   * @param userId The user ID
   * @returns The daily submission count
   */
  async getDailySubmissionCount(userId: string): Promise<number> {
    return withDatabaseErrorHandling(
      async () => {
        // Clean up old entries first (write operation)
        await executeOperation(async (db) => {
          await queries.cleanupOldSubmissionCounts(db);
        }, true);

        // Then get the count (read operation)
        return await executeOperation(async (db) => {
          return await queries.getDailySubmissionCount(db, userId);
        });
      },
      {
        operationName: "get daily submission count",
        additionalContext: { userId },
      },
      0, // Default to 0 if operation fails
    );
  }

  /**
   * Increments the daily submission count for a user.
   *
   * @param userId The user ID
   */
  async incrementDailySubmissionCount(userId: string): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await queries.incrementDailySubmissionCount(db, userId);
        }, true); // Write operation
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
