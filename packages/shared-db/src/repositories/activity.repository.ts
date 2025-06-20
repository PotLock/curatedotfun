import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import * as schema from "../schema";
import type {
  ActivityType,
  InsertActivity,
  UpdateFeedUserStats,
  UpdateUserStats,
} from "../schema/activity";
import { activityTypeZodEnum } from "../schema/activity";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

export class ActivityRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Create a new activity entry
   */
  async createActivity(data: InsertActivity, txDb: DB) {
    return withErrorHandling(
      async () => {
        // Insert the activity
        const [activityResult] = await txDb
          .insert(schema.activities)
          .values({
            user_id: data.user_id,
            type: data.type,
            feed_id: data.feed_id || null,
            submission_id: data.submission_id || null,
            data: (data.data ?? null) as unknown,
            metadata: (data.metadata ?? null) as schema.Metadata | null,
            timestamp: new Date(),
          })
          .returning();

        if (!activityResult) {
          throw new Error( // TODO: could be shared-error
            "Failed to insert activity record after insert operation",
          );
        }

        // Update user stats based on activity type
        await this.updateUserStatsForActivity(
          txDb,
          data.user_id,
          data.type as ActivityType,
          data.feed_id,
        );

        return activityResult;
      },
      {
        operationName: "create activity",
        additionalContext: { userId: data.user_id, type: data.type },
      },
    );
  }

  /**
   * Update user stats based on activity type
   */
  private async updateUserStatsForActivity(
    txDb: DB,
    userId: number,
    activityType: ActivityType,
    feedId?: string | null,
  ) {
    await txDb
      .insert(schema.userStats)
      .values({
        user_id: userId,
        total_submissions:
          activityType === activityTypeZodEnum.Enum.CONTENT_SUBMISSION ? 1 : 0,
        total_approvals:
          activityType === activityTypeZodEnum.Enum.CONTENT_APPROVAL ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: schema.userStats.user_id,
        set: {
          total_submissions:
            activityType === activityTypeZodEnum.Enum.CONTENT_SUBMISSION
              ? sql`${schema.userStats.total_submissions} + 1`
              : sql`${schema.userStats.total_submissions}`,
          total_approvals:
            activityType === activityTypeZodEnum.Enum.CONTENT_APPROVAL
              ? sql`${schema.userStats.total_approvals} + 1`
              : sql`${schema.userStats.total_approvals}`,
          updatedAt: new Date(),
        },
      });

    if (feedId) {
      await txDb
        .insert(schema.feedUserStats)
        .values({
          user_id: userId,
          feed_id: feedId,
          submissions_count:
            activityType === activityTypeZodEnum.Enum.CONTENT_SUBMISSION
              ? 1
              : 0,
          approvals_count:
            activityType === activityTypeZodEnum.Enum.CONTENT_APPROVAL ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: [schema.feedUserStats.user_id, schema.feedUserStats.feed_id],
          set: {
            submissions_count:
              activityType === activityTypeZodEnum.Enum.CONTENT_SUBMISSION
                ? sql`${schema.feedUserStats.submissions_count} + 1`
                : sql`${schema.feedUserStats.submissions_count}`,
            approvals_count:
              activityType === activityTypeZodEnum.Enum.CONTENT_APPROVAL
                ? sql`${schema.feedUserStats.approvals_count} + 1`
                : sql`${schema.feedUserStats.approvals_count}`,
            updatedAt: new Date(),
          },
        });

      // Update ranks for this feed
      await this.updateFeedRanks(txDb, feedId);
    }
  }

  /**
   * Update curator and approver ranks for a feed
   */
  private async updateFeedRanks(txDb: DB, feedId: string) {
    const rankedCurators = txDb.$with("ranked_curators").as(
      txDb
        .select({
          user_id: schema.feedUserStats.user_id,
          rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${schema.feedUserStats.submissions_count} DESC)`.as(
            "rank",
          ),
        })
        .from(schema.feedUserStats)
        .where(
          and(
            eq(schema.feedUserStats.feed_id, feedId),
            sql`${schema.feedUserStats.submissions_count} > 0`,
          ),
        ),
    );

    await txDb
      .with(rankedCurators)
      .update(schema.feedUserStats)
      .set({
        curator_rank: sql`(SELECT rank FROM ${rankedCurators} WHERE ${rankedCurators.user_id} = ${schema.feedUserStats.user_id})`,
      })
      .where(
        and(
          eq(schema.feedUserStats.feed_id, feedId),
          sql`${schema.feedUserStats.user_id} IN (SELECT user_id FROM ${rankedCurators})`,
        ),
      );

    const rankedApprovers = txDb.$with("ranked_approvers").as(
      txDb
        .select({
          user_id: schema.feedUserStats.user_id,
          rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${schema.feedUserStats.approvals_count} DESC)`.as(
            "rank",
          ),
        })
        .from(schema.feedUserStats)
        .where(
          and(
            eq(schema.feedUserStats.feed_id, feedId),
            sql`${schema.feedUserStats.approvals_count} > 0`,
          ),
        ),
    );

    await txDb
      .with(rankedApprovers)
      .update(schema.feedUserStats)
      .set({
        approver_rank: sql`(SELECT rank FROM ${rankedApprovers} WHERE ${rankedApprovers.user_id} = ${schema.feedUserStats.user_id})`,
      })
      .where(
        and(
          eq(schema.feedUserStats.feed_id, feedId),
          sql`${schema.feedUserStats.user_id} IN (SELECT user_id FROM ${rankedApprovers})`,
        ),
      );
  }

  /**
   * Get activities for a specific user
   */
  async getUserActivities(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      types?: ActivityType[];
      feed_id?: string;
      from_date?: string;
      to_date?: string;
    } = {},
  ) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          // Build conditions for the query
          const conditions = [eq(schema.activities.user_id, userId)];
          if (options.types && options.types.length > 0) {
            conditions.push(sql`${schema.activities.type} IN ${options.types}`);
          }
          if (options.feed_id) {
            conditions.push(eq(schema.activities.feed_id, options.feed_id));
          }
          if (options.from_date) {
            conditions.push(
              gte(schema.activities.timestamp, new Date(options.from_date)),
            );
          }
          if (options.to_date) {
            conditions.push(
              lte(schema.activities.timestamp, new Date(options.to_date)),
            );
          }

          const query = retryDb
            .select({
              id: schema.activities.id,
              user_id: schema.activities.user_id,
              type: schema.activities.type,
              timestamp: schema.activities.timestamp,
              feed_id: schema.activities.feed_id,
              submission_id: schema.activities.submission_id,
              data: schema.activities.data,
              metadata: schema.activities.metadata,
              // Join with users to get username
              username: schema.users.username,
              // Join with feeds to get feed name
              feed_name: schema.feeds.name,
            })
            .from(schema.activities)
            .leftJoin(
              schema.users,
              eq(schema.activities.user_id, schema.users.id),
            )
            .leftJoin(
              schema.feeds,
              eq(schema.activities.feed_id, schema.feeds.id),
            )
            .where(and(...conditions))
            .orderBy(desc(schema.activities.timestamp))
            .limit(options.limit || 20)
            .offset(options.offset || 0);

          return query;
        }, this.db);
      },
      {
        operationName: "get user activities",
        additionalContext: { userId },
      },
      [],
    );
  }

  /**
   * Get the user ranking leaderboard based on points, submissions, and approvals.
   * Can be filtered by time range and feed ID.
   */
  async getUserRankingLeaderboard(
    options: {
      time_range?: string;
      feed_id?: string;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          let startDate: Date | null = null;
          const now = new Date();

          // Determine start date based on time range
          switch (options.time_range) {
            case "day":
              startDate = new Date(
                Date.UTC(
                  now.getUTCFullYear(),
                  now.getUTCMonth(),
                  now.getUTCDate(),
                ),
              );
              break;
            case "week":
              startDate = new Date(now);
              const dayOfWeek = startDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
              const diff = startDate.getUTCDate() - dayOfWeek;
              startDate.setUTCDate(diff);
              startDate.setUTCHours(0, 0, 0, 0);
              break;
            case "month":
              startDate = new Date(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
              );
              break;
            case "year":
              startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
              break;
            default: // "all"
              startDate = null;
              break;
          }

          const conditions = [];
          if (startDate) {
            conditions.push(gte(schema.activities.timestamp, startDate));
          }
          if (options.feed_id) {
            conditions.push(eq(schema.activities.feed_id, options.feed_id));
          }

          const userActivityStats = retryDb.$with("user_activity_stats").as(
            retryDb
              .select({
                user_id: schema.activities.user_id,
                username: schema.users.username,
                total_submissions:
                  sql<number>`COUNT(CASE WHEN ${schema.activities.type} = ${activityTypeZodEnum.Enum.CONTENT_SUBMISSION} THEN 1 END)`.as(
                    "total_submissions",
                  ),
                total_approvals:
                  sql<number>`COUNT(CASE WHEN ${schema.activities.type} = ${activityTypeZodEnum.Enum.CONTENT_APPROVAL} THEN 1 END)`.as(
                    "total_approvals",
                  ),
                total_points:
                  sql<number>`COALESCE(${schema.userStats.total_points}, 0)`.as(
                    "total_points",
                  ),
              })
              .from(schema.activities)
              .innerJoin(
                schema.users,
                eq(schema.activities.user_id, schema.users.id),
              )
              .leftJoin(
                schema.userStats,
                eq(schema.activities.user_id, schema.userStats.user_id),
              )
              .where(and(...conditions))
              .groupBy(
                schema.activities.user_id,
                schema.users.username,
                schema.userStats.total_points,
              ),
          );

          const result = await retryDb
            .with(userActivityStats)
            .select({
              user_id: userActivityStats.user_id,
              username: userActivityStats.username,
              total_submissions: userActivityStats.total_submissions,
              total_approvals: userActivityStats.total_approvals,
              total_points: userActivityStats.total_points,
              rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userActivityStats.total_points} DESC, ${userActivityStats.total_submissions} DESC, ${userActivityStats.total_approvals} DESC)`.as(
                "rank",
              ),
            })
            .from(userActivityStats)
            .orderBy(sql`rank`)
            .limit(options.limit || 10);

          return result;
        }, this.db);
      },
      {
        operationName: "getUserRankingLeaderboard",
        additionalContext: { options },
      },
      [],
    );
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<any> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          // Get total submissions
          const submissionsResult = await retryDb
            .select({ count: count() })
            .from(schema.activities)
            .where(
              eq(
                schema.activities.type,
                activityTypeZodEnum.Enum.CONTENT_SUBMISSION,
              ),
            );

          // Get total approvals
          const approvalsResult = await retryDb
            .select({ count: count() })
            .from(schema.activities)
            .where(
              eq(
                schema.activities.type,
                activityTypeZodEnum.Enum.CONTENT_APPROVAL,
              ),
            );

          const totalSubmissions = submissionsResult[0]?.count || 0;
          const totalApprovals = approvalsResult[0]?.count || 0;

          // Calculate approval rate
          const approvalRate =
            totalSubmissions > 0
              ? Math.round((totalApprovals / totalSubmissions) * 100)
              : 0;

          return {
            total_submissions: totalSubmissions,
            total_approvals: totalApprovals,
            approval_rate: approvalRate,
          };
        }, this.db);
      },
      {
        operationName: "get global stats",
      },
      {
        total_submissions: 0,
        total_approvals: 0,
        approval_rate: 0,
      },
    );
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: number) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const result = await retryDb
            .select()
            .from(schema.userStats)
            .where(eq(schema.userStats.user_id, userId))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "get user stats",
        additionalContext: { userId },
      },
      null,
    );
  }

  /**
   * Update user statistics
   */
  async updateUserStats(userId: number, data: UpdateUserStats, txDb: DB) {
    return withErrorHandling(
      async () => {
        // Check if user stats exist
        const existingStats = await txDb
          .select()
          .from(schema.userStats)
          .where(eq(schema.userStats.user_id, userId))
          .limit(1);

        if (existingStats.length === 0) {
          // Create new user stats
          const [result] = await txDb
            .insert(schema.userStats)
            .values({
              user_id: userId,
              total_submissions: data.total_submissions || 0,
              total_approvals: data.total_approvals || 0,
              total_points: data.total_points || 0,
              data: (data.data ?? null) as unknown,
              metadata: (data.metadata ?? null) as schema.Metadata | null,
            })
            .returning();

          return result;
        } else {
          // Update existing user stats
          const [result] = await txDb
            .update(schema.userStats)
            .set({
              total_submissions:
                data.total_submissions !== undefined
                  ? data.total_submissions
                  : existingStats[0].total_submissions,
              total_approvals:
                data.total_approvals !== undefined
                  ? data.total_approvals
                  : existingStats[0].total_approvals,
              total_points:
                data.total_points !== undefined
                  ? data.total_points
                  : existingStats[0].total_points,
              data:
                data.data !== undefined
                  ? (data.data as unknown)
                  : existingStats[0].data,
              metadata:
                data.metadata !== undefined
                  ? (data.metadata as schema.Metadata | null)
                  : existingStats[0].metadata,
              updatedAt: new Date(),
            })
            .where(eq(schema.userStats.user_id, userId))
            .returning();

          return result;
        }
      },
      {
        operationName: "update user stats",
        additionalContext: { userId },
      },
    );
  }

  /**
   * Get feed-specific user statistics
   */
  async getFeedUserStats(userId: number, feedId: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const result = await retryDb
            .select()
            .from(schema.feedUserStats)
            .where(
              and(
                eq(schema.feedUserStats.user_id, userId),
                eq(schema.feedUserStats.feed_id, feedId),
              ),
            )
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "get feed user stats",
        additionalContext: { userId, feedId },
      },
      null,
    );
  }

  /**
   * Update feed-specific user statistics
   */
  async updateFeedUserStats(
    userId: number,
    feedId: string,
    data: UpdateFeedUserStats,
    txDb: DB,
  ) {
    return withErrorHandling(
      async () => {
        // Check if feed user stats exist
        const existingStats = await txDb
          .select()
          .from(schema.feedUserStats)
          .where(
            and(
              eq(schema.feedUserStats.user_id, userId),
              eq(schema.feedUserStats.feed_id, feedId),
            ),
          )
          .limit(1);

        if (existingStats.length === 0) {
          // Create new feed user stats
          const [result] = await txDb
            .insert(schema.feedUserStats)
            .values({
              user_id: userId,
              feed_id: feedId,
              submissions_count: data.submissions_count || 0,
              approvals_count: data.approvals_count || 0,
              points: data.points || 0,
              curator_rank: data.curator_rank || null,
              approver_rank: data.approver_rank || null,
              data: (data.data ?? null) as unknown,
              metadata: (data.metadata ?? null) as schema.Metadata | null,
            })
            .returning();

          return result;
        } else {
          // Update existing feed user stats
          const [result] = await txDb
            .update(schema.feedUserStats)
            .set({
              submissions_count:
                data.submissions_count !== undefined
                  ? data.submissions_count
                  : existingStats[0].submissions_count,
              approvals_count:
                data.approvals_count !== undefined
                  ? data.approvals_count
                  : existingStats[0].approvals_count,
              points:
                data.points !== undefined
                  ? data.points
                  : existingStats[0].points,
              curator_rank:
                data.curator_rank !== undefined
                  ? data.curator_rank
                  : existingStats[0].curator_rank,
              approver_rank:
                data.approver_rank !== undefined
                  ? data.approver_rank
                  : existingStats[0].approver_rank,
              data:
                data.data !== undefined
                  ? (data.data as unknown)
                  : existingStats[0].data,
              metadata:
                data.metadata !== undefined
                  ? (data.metadata as schema.Metadata | null)
                  : existingStats[0].metadata,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.feedUserStats.user_id, userId),
                eq(schema.feedUserStats.feed_id, feedId),
              ),
            )
            .returning();

          // Update ranks for this feed
          await this.updateFeedRanks(txDb, feedId);

          return result;
        }
      },
      {
        operationName: "update feed user stats",
        additionalContext: { userId, feedId },
      },
    );
  }

  /**
   * Get feeds that a user has curated for
   */
  async getFeedsCuratedByUser(userId: number) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          return retryDb
            .select({
              feed_id: schema.feedUserStats.feed_id,
              feed_name: schema.feeds.name,
              feed_image_url: sql<string>`${schema.feeds.config} ->> 'image'`,
              description: schema.feeds.description,
              submissions_count: schema.feedUserStats.submissions_count,
              curator_rank: schema.feedUserStats.curator_rank,
              points: schema.feedUserStats.points,
              data: schema.feedUserStats.data,
              metadata: schema.feedUserStats.metadata,
            })
            .from(schema.feedUserStats)
            .leftJoin(
              schema.feeds,
              eq(schema.feedUserStats.feed_id, schema.feeds.id),
            )
            .where(
              and(
                eq(schema.feedUserStats.user_id, userId),
                sql`${schema.feedUserStats.submissions_count} > 0`,
              ),
            )
            .orderBy(desc(schema.feedUserStats.submissions_count));
        }, this.db);
      },
      {
        operationName: "get feeds curated by user",
        additionalContext: { userId },
      },
      [],
    );
  }

  /**
   * Get feeds that a user is an approver for
   */
  async getFeedsApprovedByUser(userId: number) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          return retryDb
            .select({
              feed_id: schema.feedUserStats.feed_id,
              feed_name: schema.feeds.name,
              feed_image_url: sql<string>`${schema.feeds.config} ->> 'image'`, // TODO: we'll clean it up
              description: schema.feeds.description,
              approvals_count: schema.feedUserStats.approvals_count,
              approver_rank: schema.feedUserStats.approver_rank,
              points: schema.feedUserStats.points,
              data: schema.feedUserStats.data,
              metadata: schema.feedUserStats.metadata,
            })
            .from(schema.feedUserStats)
            .leftJoin(
              schema.feeds,
              eq(schema.feedUserStats.feed_id, schema.feeds.id),
            )
            .where(
              and(
                eq(schema.feedUserStats.user_id, userId),
                sql`${schema.feedUserStats.approvals_count} > 0`,
              ),
            )
            .orderBy(desc(schema.feedUserStats.approvals_count));
        }, this.db);
      },
      {
        operationName: "get feeds approved by user",
        additionalContext: { userId },
      },
      [],
    );
  }

  /**
   * Get a user's rank for a specific feed
   */
  async getUserFeedRanks(userId: number, feedId: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          const result = await retryDb
            .select({
              curator_rank: schema.feedUserStats.curator_rank,
              approver_rank: schema.feedUserStats.approver_rank,
            })
            .from(schema.feedUserStats)
            .where(
              and(
                eq(schema.feedUserStats.user_id, userId),
                eq(schema.feedUserStats.feed_id, feedId),
              ),
            )
            .limit(1);

          return result.length > 0
            ? {
                curatorRank: result[0].curator_rank,
                approverRank: result[0].approver_rank,
              }
            : {
                curatorRank: null,
                approverRank: null,
              };
        }, this.db);
      },
      {
        operationName: "get user feed ranks",
        additionalContext: { userId, feedId },
      },
      {
        curatorRank: null,
        approverRank: null,
      },
    );
  }
}
