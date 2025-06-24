import { and, desc, eq, gte, sql } from "drizzle-orm";
import * as schema from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

export interface FeedSubmissionCount {
  feedId: string;
  count: number;
  totalInFeed: number;
}

export interface LeaderboardEntry {
  curatorId: string;
  curatorUsername: string;
  submissionCount: number;
  approvalCount: number;
  rejectionCount: number;
  feedSubmissions: FeedSubmissionCount[];
}

/**
 * Repository for leaderboard-related database operations.
 */
export class LeaderboardRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Gets the curator statistics leaderboard data, including submission, approval,
   * and rejection counts, along with feed-specific submission details.
   *
   * @param timeRange The time range for the leaderboard (default: "all")
   *                  Valid values: "all", "month", "week", "today"
   * @returns Array of curator leaderboard entries
   */
  async getCuratorStatsLeaderboard(
    timeRange: string = "all",
  ): Promise<LeaderboardEntry[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          let startDate: Date | null = null;
          const now = new Date();

          switch (timeRange) {
            case "month":
              startDate = new Date(
                Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
              );
              break;
            case "week":
              startDate = new Date(now);
              const dayOfWeek = startDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
              const diff = startDate.getUTCDate() - dayOfWeek;
              startDate.setUTCDate(diff);
              startDate.setUTCHours(0, 0, 0, 0);
              break;
            case "today":
              startDate = new Date(
                Date.UTC(
                  now.getUTCFullYear(),
                  now.getUTCMonth(),
                  now.getUTCDate(),
                ),
              );
              break;
            default: // "all"
              startDate = null;
              break;
          }

          const dateFilter = startDate
            ? gte(schema.submissions.createdAt, startDate)
            : undefined;

          const feedTotals = dbInstance.$with("feed_totals").as(
            dbInstance
              .select({
                feedId: schema.submissionFeeds.feedId,
                totalCount:
                  sql<number>`COUNT(DISTINCT ${schema.submissionFeeds.submissionId})`.as(
                    "totalCount",
                  ),
              })
              .from(schema.submissionFeeds)
              .groupBy(schema.submissionFeeds.feedId),
          );

          const curatorStats = dbInstance.$with("curator_stats").as(
            dbInstance
              .select({
                curatorId: schema.submissions.curatorId,
                curatorUsername: schema.submissions.curatorUsername,
                submissionCount:
                  sql<number>`COUNT(DISTINCT ${schema.submissions.tweetId})`.as(
                    "submissionCount",
                  ),
                approvalCount:
                  sql<number>`COUNT(DISTINCT CASE WHEN ${schema.moderationHistory.action} = 'approve' THEN ${schema.submissions.tweetId} END)`.as(
                    "approvalCount",
                  ),
                rejectionCount:
                  sql<number>`COUNT(DISTINCT CASE WHEN ${schema.moderationHistory.action} = 'reject' THEN ${schema.submissions.tweetId} END)`.as(
                    "rejectionCount",
                  ),
              })
              .from(schema.submissions)
              .leftJoin(
                schema.moderationHistory,
                eq(
                  schema.submissions.tweetId,
                  schema.moderationHistory.submissionId,
                ),
              )
              .where(
                and(
                  sql`${schema.submissions.curatorId} IS NOT NULL`,
                  dateFilter,
                ),
              )
              .groupBy(
                schema.submissions.curatorId,
                schema.submissions.curatorUsername,
              ),
          );

          const curatorFeeds = dbInstance.$with("curator_feeds").as(
            dbInstance
              .select({
                curatorId: schema.submissions.curatorId,
                feedId: schema.submissionFeeds.feedId,
                count:
                  sql<number>`COUNT(DISTINCT ${schema.submissionFeeds.submissionId})`.as(
                    "count",
                  ),
                totalCount: feedTotals.totalCount,
              })
              .from(schema.submissionFeeds)
              .innerJoin(
                schema.submissions,
                eq(
                  schema.submissionFeeds.submissionId,
                  schema.submissions.tweetId,
                ),
              )
              .innerJoin(
                feedTotals,
                eq(schema.submissionFeeds.feedId, feedTotals.feedId),
              )
              .where(
                and(
                  sql`${schema.submissions.curatorId} IS NOT NULL`,
                  dateFilter,
                ),
              )
              .groupBy(
                schema.submissions.curatorId,
                schema.submissionFeeds.feedId,
                feedTotals.totalCount,
              ),
          );

          const result = await dbInstance
            .with(feedTotals, curatorStats, curatorFeeds)
            .select({
              curatorId: curatorStats.curatorId,
              curatorUsername: curatorStats.curatorUsername,
              submissionCount: curatorStats.submissionCount,
              approvalCount: curatorStats.approvalCount,
              rejectionCount: curatorStats.rejectionCount,
              feedSubmissions: sql<
                FeedSubmissionCount[]
              >`COALESCE(json_agg(json_build_object('feedId', ${curatorFeeds.feedId}, 'count', ${curatorFeeds.count}, 'totalInFeed', ${curatorFeeds.totalCount})) FILTER (WHERE ${curatorFeeds.feedId} IS NOT NULL), '[]'::json)`.as(
                "feedSubmissions",
              ),
            })
            .from(curatorStats)
            .leftJoin(
              curatorFeeds,
              eq(curatorStats.curatorId, curatorFeeds.curatorId),
            )
            .groupBy(
              curatorStats.curatorId,
              curatorStats.curatorUsername,
              curatorStats.submissionCount,
              curatorStats.approvalCount,
              curatorStats.rejectionCount,
            )
            .orderBy(desc(curatorStats.submissionCount));

          return result;
        }, this.db),
      {
        operationName: "get curator stats leaderboard",
        additionalContext: { timeRange },
      },
      [],
    );
  }
}
