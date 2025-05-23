import { sql } from "drizzle-orm";
import * as queries from "../queries";
import { DB } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

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
   * @returns Array of curator leaderboard entries
   */
  async getCuratorStatsLeaderboard(
    timeRange: string = "all",
  ): Promise<queries.LeaderboardEntry[]> {
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

          // Build the date filter SQL fragment conditionally
          const dateFilterSql = startDate
            ? sql`AND s.created_at >= ${startDate}`
            : sql``;

          // Use a single query with Common Table Expressions (CTEs) for better performance
          const result = await dbInstance.execute(sql`
    WITH feed_totals AS (
      -- Get total submissions per feed
      SELECT
        feed_id AS feedid,
        COUNT(DISTINCT submission_id) AS totalcount
      FROM 
        submission_feeds
      GROUP BY 
        feed_id
    ),
    curator_stats AS (
      -- Get curator statistics
      SELECT 
        s.curator_id AS curatorid,
        s.curator_username AS curatorusername,
        COUNT(DISTINCT s.tweet_id) AS submissioncount,
        COUNT(DISTINCT CASE WHEN mh.action = 'approve' THEN s.tweet_id END) AS approvalcount,
        COUNT(DISTINCT CASE WHEN mh.action = 'reject' THEN s.tweet_id END) AS rejectioncount
      FROM 
        submissions s
      LEFT JOIN 
        moderation_history mh ON s.tweet_id = mh.tweet_id
      WHERE
        s.curator_id IS NOT NULL ${dateFilterSql}
      GROUP BY
        s.curator_id, s.curator_username
    ),
    curator_feeds AS (
      -- Get feed submissions per curator
      SELECT 
        s.curator_id AS curatorid,
        sf.feed_id AS feedid,
        COUNT(DISTINCT sf.submission_id) AS count,
        ft.totalcount
      FROM 
        submission_feeds sf
      JOIN 
        submissions s ON sf.submission_id = s.tweet_id
      JOIN
        feed_totals ft ON sf.feed_id = ft.feedid
      WHERE
        s.curator_id IS NOT NULL ${dateFilterSql}
      GROUP BY
        s.curator_id, sf.feed_id, ft.totalcount
    )
    -- Combine all data with JSON aggregation
    SELECT 
      cs.curatorid,
      cs.curatorusername,
      cs.submissioncount,
      cs.approvalcount,
      cs.rejectioncount,
      COALESCE(
        json_agg(
          json_build_object(
            'feedId', cf.feedid, 
            'count', cf.count, 
            'totalInFeed', cf.totalcount
          ) ORDER BY cf.count DESC
        ) FILTER (WHERE cf.feedid IS NOT NULL),
        '[]'
      ) AS feedsubmissions
    FROM 
      curator_stats cs
    LEFT JOIN 
      curator_feeds cf ON cs.curatorid = cf.curatorid
    GROUP BY 
      cs.curatorid, cs.curatorusername, cs.submissioncount, cs.approvalcount, cs.rejectioncount
    ORDER BY 
      cs.submissioncount DESC
  `);

          // Map the results to the expected format
          return result.rows.map((row: any) => ({
            curatorId: String(row.curatorid),
            curatorUsername: String(row.curatorusername),
            submissionCount: Number(row.submissioncount),
            approvalCount: Number(row.approvalcount),
            rejectionCount: Number(row.rejectioncount),
            feedSubmissions: Array.isArray(row.feedsubmissions)
              ? row.feedsubmissions.map((fs: any) => ({
                  feedId: String(fs.feedId),
                  count: Number(fs.count),
                  totalInFeed: Number(fs.totalInFeed),
                }))
              : [],
          }));
        }, this.db),
      {
        operationName: "get curator stats leaderboard",
        additionalContext: { timeRange },
      },
      [],
    );
  }
}
