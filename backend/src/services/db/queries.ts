import { and, eq, sql } from "drizzle-orm";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { Moderation, TwitterSubmission } from "types/twitter";
import {
  feedPlugins,
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions
} from "./schema";

export function upsertFeed(
  db: BunSQLiteDatabase,
  feed: { id: string; name: string; description?: string },
) {
  return db
    .insert(feeds)
    .values({
      id: feed.id,
      name: feed.name,
      description: feed.description,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: feeds.id,
      set: {
        name: feed.name,
        description: feed.description,
      },
    });
}

export function saveSubmissionToFeed(
  db: BunSQLiteDatabase,
  submissionId: string,
  feedId: string,
) {
  return db
    .insert(submissionFeeds)
    .values({
      submissionId,
      feedId,
    })
    .onConflictDoNothing();
}

export function getFeedsBySubmission(
  db: BunSQLiteDatabase,
  submissionId: string,
) {
  return db
    .select({
      feedId: submissionFeeds.feedId,
    })
    .from(submissionFeeds)
    .where(eq(submissionFeeds.submissionId, submissionId))
    .all();
}

export function saveSubmission(
  db: BunSQLiteDatabase,
  submission: TwitterSubmission,
) {
  return db.insert(submissions).values({
    tweetId: submission.tweetId,
    userId: submission.userId,
    username: submission.username,
    content: submission.content,
    description: submission.description,
    status: submission.status,
    acknowledgmentTweetId: submission.acknowledgmentTweetId,
    createdAt: submission.createdAt,
    submittedAt: submission.submittedAt,
  });
}

export function saveModerationAction(
  db: BunSQLiteDatabase,
  moderation: Moderation,
) {
  return db.insert(moderationHistory).values({
    tweetId: moderation.tweetId,
    adminId: moderation.adminId,
    action: moderation.action,
    note: moderation.note,
    createdAt: moderation.timestamp.toISOString(),
  });
}

export function updateSubmissionStatus(
  db: BunSQLiteDatabase,
  tweetId: string,
  status: TwitterSubmission["status"],
  moderationResponseTweetId: string,
) {
  return db
    .update(submissions)
    .set({
      status,
      moderationResponseTweetId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(submissions.tweetId, tweetId));
}

type DbSubmission = {
  tweetId: string;
  userId: string;
  username: string;
  content: string;
  description: string | null;
  status: string;
  acknowledgmentTweetId: string | null;
  moderationResponseTweetId: string | null;
  createdAt: string;
  submittedAt: string;
  moderationHistory: string;
};

const moderationHistoryJson = sql<string>`json_group_array(
  CASE 
    WHEN ${moderationHistory.adminId} IS NULL THEN NULL
    ELSE json_object(
      'adminId', ${moderationHistory.adminId},
      'action', ${moderationHistory.action},
      'timestamp', ${moderationHistory.createdAt},
      'tweetId', ${moderationHistory.tweetId},
      'note', ${moderationHistory.note}
    )
  END
)`;

export function getSubmission(
  db: BunSQLiteDatabase,
  tweetId: string,
): TwitterSubmission | null {
  const result = db
    .select({
      tweetId: submissions.tweetId,
      userId: submissions.userId,
      username: submissions.username,
      content: submissions.content,
      description: submissions.description,
      status: submissions.status,
      acknowledgmentTweetId: submissions.acknowledgmentTweetId,
      moderationResponseTweetId: submissions.moderationResponseTweetId,
      createdAt: submissions.createdAt,
      submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      moderationHistory: moderationHistoryJson,
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.tweetId, moderationHistory.tweetId),
    )
    .where(eq(submissions.tweetId, tweetId))
    .groupBy(submissions.tweetId)
    .get();

  if (!result) return null;

  return {
    tweetId: result.tweetId,
    userId: result.userId,
    username: result.username,
    content: result.content,
    description: result.description ?? undefined,
    status: result.status as TwitterSubmission["status"],
    acknowledgmentTweetId: result.acknowledgmentTweetId ?? undefined,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
    createdAt: result.createdAt,
    submittedAt: result.submittedAt,
    moderationHistory: result.moderationHistory
      ? JSON.parse(`[${result.moderationHistory}]`)
        .filter((m: any) => m !== null)
        .map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      : [],
  };
}

export function getSubmissionByAcknowledgmentTweetId(
  db: BunSQLiteDatabase,
  acknowledgmentTweetId: string,
): TwitterSubmission | null {
  const result = db
    .select({
      tweetId: submissions.tweetId,
      userId: submissions.userId,
      username: submissions.username,
      content: submissions.content,
      description: submissions.description,
      status: submissions.status,
      acknowledgmentTweetId: submissions.acknowledgmentTweetId,
      moderationResponseTweetId: submissions.moderationResponseTweetId,
      createdAt: submissions.createdAt,
      submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      moderationHistory: moderationHistoryJson,
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.tweetId, moderationHistory.tweetId),
    )
    .where(eq(submissions.acknowledgmentTweetId, acknowledgmentTweetId))
    .groupBy(submissions.tweetId)
    .get();

  if (!result) return null;

  return {
    tweetId: result.tweetId,
    userId: result.userId,
    username: result.username,
    content: result.content,
    description: result.description ?? undefined,
    status: result.status as TwitterSubmission["status"],
    acknowledgmentTweetId: result.acknowledgmentTweetId ?? undefined,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
    createdAt: result.createdAt,
    submittedAt: result.submittedAt,
    moderationHistory: result.moderationHistory
      ? JSON.parse(`[${result.moderationHistory}]`)
        .filter((m: any) => m !== null)
        .map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      : [],
  };
}

export function getAllSubmissions(db: BunSQLiteDatabase): TwitterSubmission[] {
  const results = db
    .select({
      tweetId: submissions.tweetId,
      userId: submissions.userId,
      username: submissions.username,
      content: submissions.content,
      description: submissions.description,
      status: submissions.status,
      acknowledgmentTweetId: submissions.acknowledgmentTweetId,
      moderationResponseTweetId: submissions.moderationResponseTweetId,
      createdAt: submissions.createdAt,
      submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      moderationHistory: moderationHistoryJson,
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.tweetId, moderationHistory.tweetId),
    )
    .groupBy(submissions.tweetId)
    .all();

  return results.map((result) => ({
    tweetId: result.tweetId,
    userId: result.userId,
    username: result.username,
    content: result.content,
    description: result.description ?? undefined,
    status: result.status as TwitterSubmission["status"],
    acknowledgmentTweetId: result.acknowledgmentTweetId ?? undefined,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
    createdAt: result.createdAt,
    submittedAt: result.submittedAt,
    moderationHistory: result.moderationHistory
      ? JSON.parse(result.moderationHistory)
        .filter((m: any) => m !== null)
        .map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      : [],
  }));
}

export function getSubmissionsByStatus(
  db: BunSQLiteDatabase,
  status: TwitterSubmission["status"],
): TwitterSubmission[] {
  const results = db
    .select({
      tweetId: submissions.tweetId,
      userId: submissions.userId,
      username: submissions.username,
      content: submissions.content,
      description: submissions.description,
      status: submissions.status,
      acknowledgmentTweetId: submissions.acknowledgmentTweetId,
      moderationResponseTweetId: submissions.moderationResponseTweetId,
      createdAt: submissions.createdAt,
      submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      moderationHistory: moderationHistoryJson,
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.tweetId, moderationHistory.tweetId),
    )
    .where(eq(submissions.status, status))
    .groupBy(submissions.tweetId)
    .all();

  return results.map((result) => ({
    tweetId: result.tweetId,
    userId: result.userId,
    username: result.username,
    content: result.content,
    description: result.description ?? undefined,
    status: result.status as TwitterSubmission["status"],
    acknowledgmentTweetId: result.acknowledgmentTweetId ?? undefined,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
    createdAt: result.createdAt,
    submittedAt: result.submittedAt,
    moderationHistory: result.moderationHistory
      ? JSON.parse(result.moderationHistory)
        .filter((m: any) => m !== null)
        .map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      : [],
  }));
}

export function cleanupOldSubmissionCounts(
  db: BunSQLiteDatabase,
  date: string,
) {
  return db
    .delete(submissionCounts)
    .where(sql`${submissionCounts.lastResetDate} < ${date}`);
}

export function getDailySubmissionCount(
  db: BunSQLiteDatabase,
  userId: string,
  date: string,
): number {
  const result = db
    .select({ count: submissionCounts.count })
    .from(submissionCounts)
    .where(
      and(
        eq(submissionCounts.userId, userId),
        eq(submissionCounts.lastResetDate, date),
      ),
    )
    .get();

  return result?.count ?? 0;
}

export function incrementDailySubmissionCount(
  db: BunSQLiteDatabase,
  userId: string,
) {
  const today = new Date().toISOString().split("T")[0];

  return db
    .insert(submissionCounts)
    .values({
      userId,
      count: 1,
      lastResetDate: today,
    })
    .onConflictDoUpdate({
      target: submissionCounts.userId,
      set: {
        count: sql`CASE 
          WHEN ${submissionCounts.lastResetDate} < ${today} THEN 1
          ELSE ${submissionCounts.count} + 1
        END`,
        lastResetDate: today,
      },
    });
}

export function updateSubmissionAcknowledgment(
  db: BunSQLiteDatabase,
  tweetId: string,
  acknowledgmentTweetId: string,
) {
  return db
    .update(submissions)
    .set({
      acknowledgmentTweetId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(submissions.tweetId, tweetId));
}

export function removeFromSubmissionFeed(
  db: BunSQLiteDatabase,
  submissionId: string,
  feedId: string,
) {
  return db
    .delete(submissionFeeds)
    .where(
      and(
        eq(submissionFeeds.submissionId, submissionId),
        eq(submissionFeeds.feedId, feedId),
      ),
    );
}

// Feed Plugin queries
export function getFeedPlugin(
  db: BunSQLiteDatabase,
  feedId: string,
  pluginId: string,
) {
  return db
    .select()
    .from(feedPlugins)
    .where(
      and(
        eq(feedPlugins.feedId, feedId),
        eq(feedPlugins.pluginId, pluginId)
      )
    )
    .get();
}

export function upsertFeedPlugin(
  db: BunSQLiteDatabase,
  feedId: string,
  pluginId: string,
  config: Record<string, any>
) {
  return db
    .insert(feedPlugins)
    .values({
      feedId,
      pluginId,
      config: JSON.stringify(config),
    })
    .onConflictDoUpdate({
      target: [feedPlugins.feedId, feedPlugins.pluginId],
      set: {
        config: JSON.stringify(config),
        updatedAt: new Date().toISOString(),
      },
    });
}

export function getSubmissionsByFeed(
  db: BunSQLiteDatabase,
  feedId: string,
): TwitterSubmission[] {
  const results = db
    .select({
      tweetId: submissions.tweetId,
      userId: submissions.userId,
      username: submissions.username,
      content: submissions.content,
      description: submissions.description,
      status: submissions.status,
      acknowledgmentTweetId: submissions.acknowledgmentTweetId,
      moderationResponseTweetId: submissions.moderationResponseTweetId,
      createdAt: submissions.createdAt,
      submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      moderationHistory: moderationHistoryJson,
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
    .groupBy(submissions.tweetId)
    .all();

  return results.map((result) => ({
    tweetId: result.tweetId,
    userId: result.userId,
    username: result.username,
    content: result.content,
    description: result.description ?? undefined,
    status: result.status as TwitterSubmission["status"],
    acknowledgmentTweetId: result.acknowledgmentTweetId ?? undefined,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
    createdAt: result.createdAt,
    submittedAt: result.submittedAt,
    moderationHistory: result.moderationHistory
      ? JSON.parse(result.moderationHistory)
        .filter((m: any) => m !== null)
        .map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      : [],
  }));
}
