import { and, eq, sql } from "drizzle-orm";
import * as queries from "../queries";
import {
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions,
  SubmissionStatus,
  submissionStatusZodEnum
} from "../schema";
import {
  DB,
  InsertModerationHistory,
  InsertSubmission,
  SelectSubmission,
  SelectModerationHistory,
} from "../validators";
import { executeWithRetry, withErrorHandling } from "../utils";

interface FeedStatus {
  feedId: string;
  feedName: string;
  status: SubmissionStatus;
  moderationResponseTweetId?: string;
}

export interface SubmissionWithFeedData extends SelectSubmission {
  moderationHistory: SelectModerationHistory[];
  status: SubmissionStatus;
  feedStatuses: FeedStatus[];
  moderationResponseTweetId?: string;
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
  async saveModerationAction(moderation: InsertModerationHistory, txDb: DB): Promise<void> {
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
   * @returns The submission with feeds or null if not found
   */
  async getSubmission(tweetId: string): Promise<SelectSubmission | null> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(
          (retryDb) => queries.getSubmission(retryDb, tweetId),
          this.db,
        );
      },
      {
        operationName: "get submission",
        additionalContext: { tweetId },
      },
      null,
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
  ): Promise<SelectSubmission | null> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(
          (retryDb) =>
            queries.getSubmissionByCuratorTweetId(retryDb, curatorTweetId),
          this.db,
        );
      },
      {
        operationName: "get submission by curator tweet ID",
        additionalContext: { curatorTweetId },
      },
      null,
    );
  }

  /**
   * Gets all submissions, optionally filtered by status.
   *
   * @param status Optional status filter
   * @returns Array of submissions with feed data
   */
  async getAllSubmissions(status?: string): Promise<SubmissionWithFeedData[]> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          // Build the query with or without status filter
          const queryBuilder = status
            ? retryDb
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
                    updatedAt: sql<string>`${submissions.updatedAt}::text`,
                    submittedAt: sql<string>`COALESCE(${submissions.submittedAt}::text, ${submissions.createdAt}::text)`,
                  },
                  m: {
                    id: moderationHistory.id,
                    tweetId: moderationHistory.tweetId,
                    adminId: moderationHistory.adminId,
                    action: moderationHistory.action,
                    note: moderationHistory.note,
                    createdAt: moderationHistory.createdAt,
                    updatedAt: moderationHistory.updatedAt,
                    feedId: moderationHistory.feedId,
                    moderationResponseTweetId: // This is selected but will NOT be part of SelectModerationHistory object
                      submissionFeeds.moderationResponseTweetId,
                  },
                  sf: {
                    submissionId: submissionFeeds.submissionId,
                    feedId: submissionFeeds.feedId,
                    status: submissionFeeds.status,
                    moderationResponseTweetId:
                      submissionFeeds.moderationResponseTweetId,
                  },
                  f: {
                    id: feeds.id,
                    name: feeds.name,
                  },
                })
                .from(submissions)
                .leftJoin(
                  moderationHistory,
                  eq(submissions.tweetId, moderationHistory.tweetId),
                )
                .leftJoin(
                  submissionFeeds,
                  eq(submissions.tweetId, submissionFeeds.submissionId),
                )
                .leftJoin(feeds, eq(submissionFeeds.feedId, feeds.id))
                .where(eq(submissionFeeds.status, status as SubmissionStatus))
            : retryDb
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
                    updatedAt: sql<string>`${submissions.updatedAt}::text`,
                    submittedAt: sql<string>`COALESCE(${submissions.submittedAt}::text, ${submissions.createdAt}::text)`,
                  },
                  m: {
                    id: moderationHistory.id,
                    tweetId: moderationHistory.tweetId,
                    adminId: moderationHistory.adminId,
                    action: moderationHistory.action,
                    note: moderationHistory.note,
                    createdAt: moderationHistory.createdAt, 
                    updatedAt: moderationHistory.updatedAt,
                    feedId: moderationHistory.feedId,
                    moderationResponseTweetId: // This is selected but will NOT be part of SelectModerationHistory object
                      submissionFeeds.moderationResponseTweetId,
                  },
                  sf: {
                    submissionId: submissionFeeds.submissionId,
                    feedId: submissionFeeds.feedId,
                    status: submissionFeeds.status,
                    moderationResponseTweetId:
                      submissionFeeds.moderationResponseTweetId,
                  },
                  f: {
                    id: feeds.id,
                    name: feeds.name,
                  },
                })
                .from(submissions)
                .leftJoin(
                  moderationHistory,
                  eq(submissions.tweetId, moderationHistory.tweetId),
                )
                .leftJoin(
                  submissionFeeds,
                  eq(submissions.tweetId, submissionFeeds.submissionId),
                )
                .leftJoin(feeds, eq(submissionFeeds.feedId, feeds.id));

          const results = await queryBuilder.orderBy(
            moderationHistory.createdAt,
          );

          // Group results by submission
          const submissionMap = new Map<string, SubmissionWithFeedData>();
          const feedStatusMap = new Map<string, Map<string, FeedStatus>>();

          for (const result of results) {
            // Initialize submission if not exists
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
                updatedAt: new Date(result.s.updatedAt!),
                submittedAt: result.s.submittedAt,
                moderationHistory: [],
                status: status
                  ? (status as SubmissionStatus)
                  : submissionStatusZodEnum.Enum.pending, // Use provided status or default
                feedStatuses: [],
              });

              // Initialize feed status map for this submission
              feedStatusMap.set(
                result.s.tweetId,
                new Map<string, FeedStatus>(),
              );
            }

            // Add moderation history
            if (result.m && result.m.adminId !== null && result.m.tweetId && result.m.id !== null) {
              const submission = submissionMap.get(result.s.tweetId)!;
              const moderationEntry: SelectModerationHistory = {
                id: result.m.id!,
                tweetId: result.m.tweetId!,
                feedId: result.m.feedId!,
                adminId: result.m.adminId!,
                action: result.m.action as "approve" | "reject",
                note: result.m.note,
                createdAt: new Date(result.m.createdAt!),
                updatedAt: new Date(result.m.updatedAt!),
                // moderationResponseTweetId is NOT part of SelectModerationHistory
              };
              submission.moderationHistory.push(moderationEntry);
            }

            // Add feed status if available
            if (result.sf?.feedId && result.f?.id) {
              // If status is provided, only include feeds with that status
              if (!status || result.sf.status === status) {
                const feedStatusesForSubmission = feedStatusMap.get(
                  result.s.tweetId,
                )!;

                if (!feedStatusesForSubmission.has(result.sf.feedId)) {
                  feedStatusesForSubmission.set(result.sf.feedId, {
                    feedId: result.sf.feedId,
                    feedName: result.f.name,
                    status: result.sf.status,
                    moderationResponseTweetId:
                      result.sf.moderationResponseTweetId ?? undefined,
                  });
                }
              }
            }
          }

          // Set the feed statuses and determine the main status for each submission
          for (const [tweetId, submission] of submissionMap.entries()) {
            const feedStatusesForSubmission = feedStatusMap.get(tweetId);
            if (feedStatusesForSubmission) {
              submission.feedStatuses = Array.from(
                feedStatusesForSubmission.values(),
              );

              // Determine the main status based on priority (pending > rejected > approved)
              let hasPending = false;
              let hasRejected = false;
              let hasApproved = false;

              for (const feedStatus of submission.feedStatuses) {
                if (feedStatus.status === submissionStatusZodEnum.Enum.pending) {
                  hasPending = true;
                  submission.status = submissionStatusZodEnum.Enum.pending;
                  submission.moderationResponseTweetId =
                    feedStatus.moderationResponseTweetId;
                  break; // Pending has highest priority
                } else if (feedStatus.status === submissionStatusZodEnum.Enum.rejected) {
                  hasRejected = true;
                } else if (feedStatus.status === submissionStatusZodEnum.Enum.approved) {
                  hasApproved = true;
                }
              }

              if (!hasPending) {
                if (hasRejected) {
                  submission.status = submissionStatusZodEnum.Enum.rejected;
                  // Find first rejected status for moderationResponseTweetId
                  const rejectedStatus = submission.feedStatuses.find(
                    (fs) => fs.status === submissionStatusZodEnum.Enum.rejected,
                  );
                  if (rejectedStatus) {
                    submission.moderationResponseTweetId =
                      rejectedStatus.moderationResponseTweetId;
                  }
                } else if (hasApproved) {
                  submission.status = submissionStatusZodEnum.Enum.approved;
                  // Find first approved status for moderationResponseTweetId
                  const approvedStatus = submission.feedStatuses.find(
                    (fs) => fs.status === submissionStatusZodEnum.Enum.approved,
                  );
                  if (approvedStatus) {
                    submission.moderationResponseTweetId =
                      approvedStatus.moderationResponseTweetId;
                  }
                }
              }
            }
          }

          return Array.from(submissionMap.values());
        }, this.db);
      },
      {
        operationName: "get all submissions",
        additionalContext: status ? { status } : {},
      },
      [],
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
