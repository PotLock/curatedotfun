import { and, eq, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  FeedStatus,
  Moderation,
  Submission,
  SubmissionFeed,
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../../types/twitter";
import {
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions,
} from "./schema";

export async function upsertFeeds(
  db: NodePgDatabase<any>,
  feedsToUpsert: { id: string; name: string; description?: string }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const feed of feedsToUpsert) {
      await tx
        .insert(feeds)
        .values({
          id: feed.id,
          name: feed.name,
          description: feed.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: feeds.id,
          set: {
            name: feed.name,
            description: feed.description,
          },
        })
        .execute();
    }
  });
}

export async function saveSubmissionToFeed(
  db: NodePgDatabase<any>,
  submissionId: string,
  feedId: string,
  status: SubmissionStatus = SubmissionStatus.PENDING,
): Promise<void> {
  // Check if submission exists
  const submissions_result = await db
    .select({ id: submissions.tweetId })
    .from(submissions)
    .where(eq(submissions.tweetId, submissionId));

  if (!submissions_result.length) {
    throw new Error(`Submission with ID ${submissionId} does not exist`);
  }

  // Check if feed exists
  const feeds_result = await db
    .select({ id: feeds.id })
    .from(feeds)
    .where(eq(feeds.id, feedId));

  if (!feeds_result.length) {
    throw new Error(`Feed with ID ${feedId} does not exist`);
  }

  await db
    .insert(submissionFeeds)
    .values({
      submissionId,
      feedId,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      moderationResponseTweetId: null,
    })
    .onConflictDoNothing()
    .execute();
}

export async function getFeedsBySubmission(
  db: NodePgDatabase<any>,
  submissionId: string,
): Promise<SubmissionFeed[]> {
  const results = await db
    .select({
      submissionId: submissionFeeds.submissionId,
      feedId: submissionFeeds.feedId,
      status: submissionFeeds.status,
      moderationResponseTweetId: submissionFeeds.moderationResponseTweetId,
    })
    .from(submissionFeeds)
    .where(eq(submissionFeeds.submissionId, submissionId));

  return results.map((result) => ({
    ...result,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
  }));
}

export async function saveSubmission(
  db: NodePgDatabase<any>,
  submission: Submission,
): Promise<void> {
  await db
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
      createdAt: new Date(submission.createdAt),
      submittedAt: submission.submittedAt
        ? new Date(submission.submittedAt)
        : null,
    } as any)
    .execute();
}

export async function saveModerationAction(
  db: NodePgDatabase<any>,
  moderation: Moderation,
): Promise<void> {
  await db
    .insert(moderationHistory)
    .values({
      tweetId: moderation.tweetId,
      feedId: moderation.feedId,
      adminId: moderation.adminId,
      action: moderation.action,
      note: moderation.note,
      createdAt: moderation.timestamp,
    } as any)
    .execute();
}

export async function getModerationHistory(
  db: NodePgDatabase<any>,
  tweetId: string,
): Promise<Moderation[]> {
  const results = await db
    .select({
      tweetId: moderationHistory.tweetId,
      feedId: moderationHistory.feedId,
      adminId: moderationHistory.adminId,
      action: moderationHistory.action,
      note: moderationHistory.note,
      createdAt: moderationHistory.createdAt,
      moderationResponseTweetId: submissionFeeds.moderationResponseTweetId,
    })
    .from(moderationHistory)
    .leftJoin(
      submissionFeeds,
      and(
        eq(moderationHistory.tweetId, submissionFeeds.submissionId),
        eq(moderationHistory.feedId, submissionFeeds.feedId),
      ),
    )
    .where(eq(moderationHistory.tweetId, tweetId))
    .orderBy(moderationHistory.createdAt);

  return results.map((result) => ({
    tweetId: result.tweetId,
    feedId: result.feedId,
    adminId: result.adminId,
    action: result.action as "approve" | "reject",
    note: result.note,
    timestamp: result.createdAt,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
  }));
}

export async function updateSubmissionFeedStatus(
  db: NodePgDatabase<any>,
  submissionId: string,
  feedId: string,
  status: SubmissionStatus,
  moderationResponseTweetId: string,
): Promise<void> {
  await db
    .update(submissionFeeds)
    .set({
      status,
      moderationResponseTweetId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(submissionFeeds.submissionId, submissionId),
        eq(submissionFeeds.feedId, feedId),
      ),
    )
    .execute();
}

export async function getSubmissionByCuratorTweetId(
  db: NodePgDatabase<any>,
  curatorTweetId: string,
): Promise<Submission | null> {
  const results = await db
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
      m: {
        tweetId: moderationHistory.tweetId,
        adminId: moderationHistory.adminId,
        action: moderationHistory.action,
        note: moderationHistory.note,
        createdAt: moderationHistory.createdAt,
        feedId: moderationHistory.feedId,
        moderationResponseTweetId: submissionFeeds.moderationResponseTweetId,
      },
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.tweetId, moderationHistory.tweetId),
    )
    .leftJoin(
      submissionFeeds,
      and(
        eq(submissions.tweetId, submissionFeeds.submissionId),
        eq(moderationHistory.feedId, submissionFeeds.feedId),
      ),
    )
    .where(eq(submissions.curatorTweetId, curatorTweetId))
    .orderBy(moderationHistory.createdAt);

  if (!results.length) return null;

  // Group moderation history
  const modHistory: Moderation[] = results
    .filter((r: any) => r.m && r.m.adminId !== null)
    .map((r: any) => ({
      tweetId: results[0].s.tweetId,
      feedId: r.m.feedId!,
      adminId: r.m.adminId!,
      action: r.m.action as "approve" | "reject",
      note: r.m.note,
      timestamp: r.m.createdAt!,
      moderationResponseTweetId: r.m.moderationResponseTweetId ?? undefined,
    }));

  // Get feeds for this submission
  const feeds = await getFeedsBySubmission(db, results[0].s.tweetId);

  return {
    tweetId: results[0].s.tweetId,
    userId: results[0].s.userId,
    username: results[0].s.username,
    content: results[0].s.content,
    curatorNotes: results[0].s.curatorNotes,
    curatorId: results[0].s.curatorId,
    curatorUsername: results[0].s.curatorUsername,
    curatorTweetId: results[0].s.curatorTweetId,
    createdAt: new Date(results[0].s.createdAt),
    submittedAt: results[0].s.submittedAt
      ? new Date(results[0].s.submittedAt)
      : null,
    moderationHistory: modHistory,
    feeds,
  };
}

export async function getSubmission(
  db: NodePgDatabase<any>,
  tweetId: string,
): Promise<Submission | null> {
  const results = await db
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
      m: {
        tweetId: moderationHistory.tweetId,
        adminId: moderationHistory.adminId,
        action: moderationHistory.action,
        note: moderationHistory.note,
        createdAt: moderationHistory.createdAt,
        feedId: moderationHistory.feedId,
        moderationResponseTweetId: submissionFeeds.moderationResponseTweetId,
      },
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.tweetId, moderationHistory.tweetId),
    )
    .leftJoin(
      submissionFeeds,
      and(
        eq(submissions.tweetId, submissionFeeds.submissionId),
        eq(moderationHistory.feedId, submissionFeeds.feedId),
      ),
    )
    .where(eq(submissions.tweetId, tweetId))
    .orderBy(moderationHistory.createdAt);

  if (!results.length) return null;

  // Group moderation history
  const modHistory: Moderation[] = results
    .filter((r: any) => r.m && r.m.adminId !== null)
    .map((r: any) => ({
      tweetId,
      feedId: r.m.feedId!,
      adminId: r.m.adminId!,
      action: r.m.action as "approve" | "reject",
      note: r.m.note,
      timestamp: r.m.createdAt!,
      moderationResponseTweetId: r.m.moderationResponseTweetId ?? undefined,
    }));

  // Get feeds for this submission
  const feeds = await getFeedsBySubmission(db, tweetId);

  return {
    tweetId: results[0].s.tweetId,
    userId: results[0].s.userId,
    username: results[0].s.username,
    content: results[0].s.content,
    curatorNotes: results[0].s.curatorNotes,
    curatorId: results[0].s.curatorId,
    curatorUsername: results[0].s.curatorUsername,
    curatorTweetId: results[0].s.curatorTweetId,
    createdAt: new Date(results[0].s.createdAt),
    submittedAt: results[0].s.submittedAt
      ? new Date(results[0].s.submittedAt)
      : null,
    moderationHistory: modHistory,
    feeds,
  };
}

export async function getAllSubmissions(
  db: NodePgDatabase<any>,
  status?: string,
): Promise<SubmissionWithFeedData[]> {
  // Build the query with or without status filter
  const queryBuilder = status
    ? db
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
    : db
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

  const results = await queryBuilder.orderBy(moderationHistory.createdAt);

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
        submittedAt: result.s.submittedAt
          ? new Date(result.s.submittedAt)
          : null,
        moderationHistory: [],
        status: status
          ? (status as SubmissionStatus)
          : SubmissionStatus.PENDING, // Use provided status or default
        feedStatuses: [],
      });

      // Initialize feed status map for this submission
      feedStatusMap.set(result.s.tweetId, new Map<string, FeedStatus>());
    }

    // Add moderation history
    if (result.m && result.m.adminId !== null) {
      const submission = submissionMap.get(result.s.tweetId)!;
      submission.moderationHistory.push({
        tweetId: result.s.tweetId,
        feedId: result.m.feedId!,
        adminId: result.m.adminId,
        action: result.m.action as "approve" | "reject",
        note: result.m.note,
        timestamp: result.m.createdAt!,
        moderationResponseTweetId:
          result.m.moderationResponseTweetId ?? undefined,
      });
    }

    // Add feed status if available
    if (result.sf?.feedId && result.f?.id) {
      // If status is provided, only include feeds with that status
      if (!status || result.sf.status === status) {
        const feedStatusesForSubmission = feedStatusMap.get(result.s.tweetId)!;

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
      submission.feedStatuses = Array.from(feedStatusesForSubmission.values());

      // Determine the main status based on priority (pending > rejected > approved)
      let hasPending = false;
      let hasRejected = false;
      let hasApproved = false;

      for (const feedStatus of submission.feedStatuses) {
        if (feedStatus.status === SubmissionStatus.PENDING) {
          hasPending = true;
          submission.status = SubmissionStatus.PENDING;
          submission.moderationResponseTweetId =
            feedStatus.moderationResponseTweetId;
          break; // Pending has highest priority
        } else if (feedStatus.status === SubmissionStatus.REJECTED) {
          hasRejected = true;
        } else if (feedStatus.status === SubmissionStatus.APPROVED) {
          hasApproved = true;
        }
      }

      if (!hasPending) {
        if (hasRejected) {
          submission.status = SubmissionStatus.REJECTED;
          // Find first rejected status for moderationResponseTweetId
          const rejectedStatus = submission.feedStatuses.find(
            (fs) => fs.status === SubmissionStatus.REJECTED,
          );
          if (rejectedStatus) {
            submission.moderationResponseTweetId =
              rejectedStatus.moderationResponseTweetId;
          }
        } else if (hasApproved) {
          submission.status = SubmissionStatus.APPROVED;
          // Find first approved status for moderationResponseTweetId
          const approvedStatus = submission.feedStatuses.find(
            (fs) => fs.status === SubmissionStatus.APPROVED,
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
}

export async function cleanupOldSubmissionCounts(
  db: NodePgDatabase<any>,
): Promise<void> {
  await db
    .delete(submissionCounts)
    .where(sql`${submissionCounts.lastResetDate} < CURRENT_DATE`)
    .execute();
}

export async function getDailySubmissionCount(
  db: NodePgDatabase<any>,
  userId: string,
): Promise<number> {
  const results = await db
    .select({ count: submissionCounts.count })
    .from(submissionCounts)
    .where(
      and(
        eq(submissionCounts.userId, userId),
        eq(submissionCounts.lastResetDate, sql`CURRENT_DATE`),
      ),
    );

  return results.length > 0 ? results[0].count : 0;
}

export async function incrementDailySubmissionCount(
  db: NodePgDatabase<any>,
  userId: string,
): Promise<void> {
  await db
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
          WHEN ${submissionCounts.lastResetDate} < CURRENT_DATE THEN 1
          ELSE ${submissionCounts.count} + 1
        END`,
        lastResetDate: sql`CURRENT_DATE`,
      },
    })
    .execute();
}

export async function removeFromSubmissionFeed(
  db: NodePgDatabase<any>,
  submissionId: string,
  feedId: string,
): Promise<void> {
  await db
    .delete(submissionFeeds)
    .where(
      and(
        eq(submissionFeeds.submissionId, submissionId),
        eq(submissionFeeds.feedId, feedId),
      ),
    )
    .execute();
}

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

export interface CountResult {
  count: number;
}

export async function getPostsCount(db: NodePgDatabase<any>): Promise<number> {
  // Count approved submissions
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT submission_id) as count
    FROM submission_feeds
    WHERE status = 'approved'
  `);

  return result.rows.length > 0 ? Number(result.rows[0].count) : 0;
}

export async function getCuratorsCount(
  db: NodePgDatabase<any>,
): Promise<number> {
  // Count unique curator IDs
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT curator_id) as count
    FROM submissions
    WHERE curator_id IS NOT NULL
  `);

  return result.rows.length > 0 ? Number(result.rows[0].count) : 0;
}

export async function getLeaderboard(
  db: NodePgDatabase<any>,
  timeRange: string = "all",
): Promise<LeaderboardEntry[]> {
  // Use PostgreSQL's date functions for more efficient filtering
  let dateCondition;

  switch (timeRange) {
    case "month":
      // First day of current month using PostgreSQL's date_trunc
      dateCondition = sql`AND s.created_at >= date_trunc('month', CURRENT_DATE)`;
      break;
    case "week":
      // Start of current week (Sunday) using PostgreSQL's date_trunc
      dateCondition = sql`AND s.created_at >= date_trunc('week', CURRENT_DATE)`;
      break;
    case "today":
      // Start of today using PostgreSQL's date_trunc
      dateCondition = sql`AND s.created_at >= date_trunc('day', CURRENT_DATE)`;
      break;
    default:
      // No date filter for "all"
      dateCondition = sql``;
      break;
  }

  // Use a single query with Common Table Expressions (CTEs) for better performance
  const result = await db.execute(sql`
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
        1=1 ${dateCondition}
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
        1=1 ${dateCondition}
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
}

export async function getSubmissionsByFeed(
  db: NodePgDatabase<any>,
  feedId: string,
): Promise<Submission[]> {
  const results = await db
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
        moderationResponseTweetId: submissionFeeds.moderationResponseTweetId,
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
}
