import { and, eq, sql } from "drizzle-orm";
import {
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions,
  submissionStatusZodEnum,
} from "./schema";
import {
  DB,
  SelectModerationHistory,
  SelectSubmission,
  SelectSubmissionFeed,
} from "./validators";

export async function saveSubmissionToFeed(
  db: DB,
  submissionId: string,
  feedId: string,
  status: SelectSubmissionFeed["status"] = submissionStatusZodEnum.Enum.pending,
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
): Promise<SelectSubmissionFeed[]> {
  const results = await db
    .select({
      submissionId: submissionFeeds.submissionId,
      feedId: submissionFeeds.feedId,
      status: submissionFeeds.status,
      moderationResponseTweetId: submissionFeeds.moderationResponseTweetId,
      createdAt: submissionFeeds.createdAt,
      updatedAt: submissionFeeds.updatedAt,
    })
    .from(submissionFeeds)
    .where(eq(submissionFeeds.submissionId, submissionId));

  return results;
}

export async function getModerationHistory(
  db: DB,
  tweetId: string,
): Promise<SelectModerationHistory[]> {
  const results = await db
    .select({
      id: moderationHistory.id,
      tweetId: moderationHistory.tweetId,
      feedId: moderationHistory.feedId,
      adminId: moderationHistory.adminId,
      action: moderationHistory.action,
      note: moderationHistory.note,
      createdAt: moderationHistory.createdAt,
      updatedAt: moderationHistory.updatedAt,
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

  return results;
}

export async function updateSubmissionFeedStatus(
  db: DB,
  submissionId: string,
  feedId: string,
  status: SelectSubmissionFeed["status"],
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
): Promise<SelectSubmission | null> {
  const results = await db
    .select()
    .from(submissions)
    .where(eq(submissions.curatorTweetId, curatorTweetId))
    .limit(1);

  if (!results.length) return null;

  return results[0] as SelectSubmission;
}

export async function getSubmission(
  db: DB,
  tweetId: string,
): Promise<SelectSubmission | null> {
  const results = await db
    .select()
    .from(submissions)
    .where(eq(submissions.tweetId, tweetId))
    .limit(1);

  if (!results.length) return null;

  // Drizzle returns date objects directly if not cast to text in SQL
  return results[0] as SelectSubmission;
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
