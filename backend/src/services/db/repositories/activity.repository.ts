import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { DatabaseError } from "../../../types/errors";
import {
  GlobalStats,
  UserRankingLeaderboardEntry,
} from "../../../validation/activity.validation";
import * as schema from "../schema";
import { ActivityType } from "../schema/activity";
import {
  DB,
  InsertActivity,
  UpdateFeedUserStats,
  UpdateUserStats,
} from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

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
            type: data.type as ActivityType,
            feed_id: data.feed_id || null,
            submission_id: data.submission_id || null,
            data: (data.data ?? null) as unknown,
            metadata: (data.metadata ?? null) as schema.Metadata | null,
            timestamp: new Date(),
          })
          .returning();

        if (!activityResult) {
          throw new DatabaseError(
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
    // Update global user stats
    const userStatsExists = await txDb
      .select({ count: count() })
      .from(schema.userStats)
      .where(eq(schema.userStats.user_id, userId));

    if (userStatsExists[0].count === 0) {
      // Create new user stats record
      await txDb.insert(schema.userStats).values({
        user_id: userId,
        total_submissions:
          activityType === ActivityType.CONTENT_SUBMISSION ? 1 : 0,
        total_approvals: activityType === ActivityType.CONTENT_APPROVAL ? 1 : 0,
        total_points: 0, // Points would be calculated based on business logic
        data: null,
        metadata: null,
      });
    } else {
      // Update existing user stats
      await txDb.execute(sql`
        UPDATE ${schema.userStats}
        SET
          total_submissions = CASE WHEN ${activityType} = ${ActivityType.CONTENT_SUBMISSION} THEN total_submissions + 1 ELSE total_submissions END,
          total_approvals = CASE WHEN ${activityType} = ${ActivityType.CONTENT_APPROVAL} THEN total_approvals + 1 ELSE total_approvals END,
          "updatedAt" = ${new Date()}
        WHERE user_id = ${userId}
      `);
    }

    // Update feed-specific user stats if feedId is provided
    if (feedId) {
      const feedUserStatsExists = await txDb
        .select({ count: count() })
        .from(schema.feedUserStats)
        .where(
          and(
            eq(schema.feedUserStats.user_id, userId),
            eq(schema.feedUserStats.feed_id, feedId),
          ),
        );

      if (feedUserStatsExists[0].count === 0) {
        // Create new feed user stats record
        await txDb.insert(schema.feedUserStats).values({
          user_id: userId,
          feed_id: feedId,
          submissions_count:
            activityType === ActivityType.CONTENT_SUBMISSION ? 1 : 0,
          approvals_count:
            activityType === ActivityType.CONTENT_APPROVAL ? 1 : 0,
          points: 0, // Points would be calculated based on business logic
          data: null,
          metadata: null,
        });
      } else {
        // Update existing feed user stats
        await txDb.execute(sql`
        UPDATE ${schema.feedUserStats}
        SET
          submissions_count = CASE WHEN ${activityType} = ${ActivityType.CONTENT_SUBMISSION} THEN submissions_count + 1 ELSE submissions_count END,
          approvals_count = CASE WHEN ${activityType} = ${ActivityType.CONTENT_APPROVAL} THEN approvals_count + 1 ELSE approvals_count END,
          "updatedAt" = ${new Date()}
        WHERE user_id = ${userId} AND feed_id = ${feedId}
      `);
      }

      // Update ranks for this feed
      await this.updateFeedRanks(txDb, feedId);
    }
  }

  /**
   * Update curator and approver ranks for a feed
   */
  private async updateFeedRanks(txDb: DB, feedId: string) {
    // Update curator ranks
    await txDb.execute(sql`
      WITH ranked_curators AS (
        SELECT 
          user_id,
          submissions_count,
          ROW_NUMBER() OVER (ORDER BY submissions_count DESC) as rank
        FROM 
          ${schema.feedUserStats}
        WHERE 
          feed_id = ${feedId} AND submissions_count > 0
      )
      UPDATE ${schema.feedUserStats} fus
      SET curator_rank = rc.rank
      FROM ranked_curators rc
      WHERE fus.user_id = rc.user_id AND fus.feed_id = ${feedId}
    `);

    // Update approver ranks
    await txDb.execute(sql`
      WITH ranked_approvers AS (
        SELECT 
          user_id,
          approvals_count,
          ROW_NUMBER() OVER (ORDER BY approvals_count DESC) as rank
        FROM 
          ${schema.feedUserStats}
        WHERE 
          feed_id = ${feedId} AND approvals_count > 0
      )
      UPDATE ${schema.feedUserStats} fus
      SET approver_rank = ra.rank
      FROM ranked_approvers ra
      WHERE fus.user_id = ra.user_id AND fus.feed_id = ${feedId}
    `);
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
  ): Promise<UserRankingLeaderboardEntry[]> {
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

          // Build the date filter SQL fragment conditionally
          const dateFilterSql = startDate
            ? sql`AND a.timestamp >= ${startDate}`
            : sql``;

          // Build the feed filter SQL fragment conditionally
          const feedFilterSql = options.feed_id
            ? sql`AND a.feed_id = ${options.feed_id}`
            : sql``;

          // Use a CTE query to get the leaderboard data
          const result = await retryDb.execute(sql` 
            WITH user_activity_stats AS (
              -- Get user activity statistics
              SELECT 
                a.user_id,
                u.username,
                u.name,
                COUNT(CASE WHEN a.type = ${ActivityType.CONTENT_SUBMISSION} THEN 1 END) AS total_submissions,
                COUNT(CASE WHEN a.type = ${ActivityType.CONTENT_APPROVAL} THEN 1 END) AS total_approvals,
                COALESCE(us.total_points, 0) AS total_points
              FROM 
                ${schema.activities} a
              JOIN 
                ${schema.users} u ON a.user_id = u.id
              LEFT JOIN
                ${schema.userStats} us ON a.user_id = us.user_id
              WHERE
                1=1 ${dateFilterSql} ${feedFilterSql}
              GROUP BY
                a.user_id, u.username, u.name, us.total_points
            )
            -- Rank users and return results
            SELECT 
              user_id,
              username,
              name,
              total_submissions,
              total_approvals,
              total_points,
              ROW_NUMBER() OVER (ORDER BY total_points DESC, total_submissions DESC, total_approvals DESC) AS rank
            FROM 
              user_activity_stats
            ORDER BY 
              rank
            LIMIT ${options.limit || 10}
          `);

          // Map the results to the expected format
          return result.rows.map((row: any) => ({
            user_id: Number(row.user_id),
            username: row.username,
            name: row.name,
            total_points: Number(row.total_points),
            total_submissions: Number(row.total_submissions),
            total_approvals: Number(row.total_approvals),
            rank: Number(row.rank),
          }));
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
  async getGlobalStats(): Promise<GlobalStats> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (retryDb) => {
          // Get total submissions
          const submissionsResult = await retryDb
            .select({ count: count() })
            .from(schema.activities)
            .where(eq(schema.activities.type, ActivityType.CONTENT_SUBMISSION));

          // Get total approvals
          const approvalsResult = await retryDb
            .select({ count: count() })
            .from(schema.activities)
            .where(eq(schema.activities.type, ActivityType.CONTENT_APPROVAL));

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
