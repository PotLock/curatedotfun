import { and, eq, sql } from "drizzle-orm";
import { FeedConfig } from "../../types/config.zod";
import {
  FeedStatus,
  Moderation,
  Submission,
  SubmissionFeed,
  SubmissionStatus,
  SubmissionWithFeedData,
} from "../../types/submission";
import {
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions,
} from "./schema";
import { DB } from "./types";

export async function upsertFeeds(
  db: DB,
  feedsToUpsert: FeedConfig[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const feedConfig of feedsToUpsert) {
      await tx
        .insert(feeds)
        .values({
          id: feedConfig.id,
          config: feedConfig,
          name: feedConfig.name,
          description: feedConfig.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: feeds.id,
          set: {
            config: feedConfig,
            name: feedConfig.name,
            description: feedConfig.description,
            updatedAt: new Date(),
          },
        })
        .execute();
    }
  });
}

export async function saveSubmissionToFeed(
  db: DB,
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
  db: DB,
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

export async function getModerationHistory(
  db: DB,
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
  db: DB,
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
  db: DB,
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
  db: DB,
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

export async function getDailySubmissionCount(
  db: DB,
  userId: string,
): Promise<number> {
  const results = await db
    .select({ count: submissionCounts.count })
    .from(submissionCounts)
    .where(
      and(
        eq(submissionCounts.userId, userId),
        eq(sql`${submissionCounts.lastResetDate}::date`, sql`CURRENT_DATE`),
      ),
    );

  return results.length > 0 ? results[0].count : 0;
}

export async function removeFromSubmissionFeed(
  db: DB,
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

export async function getPostsCount(db: DB): Promise<number> {
  // Count approved submissions
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT submission_id) as count
    FROM submission_feeds
    WHERE status = 'approved'
  `);

  return result.rows.length > 0 ? Number(result.rows[0].count) : 0;
}
