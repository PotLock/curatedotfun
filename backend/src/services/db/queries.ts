import { and, eq, sql } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  SubmissionFeed,
  Moderation,
  TwitterSubmission,
  SubmissionStatus,
  TwitterSubmissionWithFeedData,
} from "../../types/twitter";
import {
  feedPlugins,
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions,
} from "./schema";
import { DbQueryResult, DbFeedQueryResult } from "./types";

export async function upsertFeeds(
  db: BetterSQLite3Database,
  feedsToUpsert: { id: string; name: string; description?: string }[],
) {
  return await db.transaction(async (tx) => {
    for (const feed of feedsToUpsert) {
      await tx
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
  });
}

export async function saveSubmissionToFeed(
  db: BetterSQLite3Database,
  submissionId: string,
  feedId: string,
  status: SubmissionStatus = SubmissionStatus.PENDING,
) {
  // Check if submission exists
  const submission = await db
    .select({ id: submissions.tweetId })
    .from(submissions)
    .where(eq(submissions.tweetId, submissionId))
    .get();

  if (!submission) {
    throw new Error(`Submission with ID ${submissionId} does not exist`);
  }

  // Check if feed exists
  const feed = await db
    .select({ id: feeds.id })
    .from(feeds)
    .where(eq(feeds.id, feedId))
    .get();

  if (!feed) {
    throw new Error(`Feed with ID ${feedId} does not exist`);
  }

  return await db
    .insert(submissionFeeds)
    .values({
      submissionId,
      feedId,
      status,
    })
    .onConflictDoNothing();
}

export async function getFeedsBySubmission(
  db: BetterSQLite3Database,
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
    .where(eq(submissionFeeds.submissionId, submissionId))
    .all();

  return results.map((result) => ({
    ...result,
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
  }));
}

export async function saveSubmission(
  db: BetterSQLite3Database,
  submission: TwitterSubmission,
) {
  return db.insert(submissions).values({
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
  });
}

export async function saveModerationAction(
  db: BetterSQLite3Database,
  moderation: Moderation,
) {
  return db.insert(moderationHistory).values({
    tweetId: moderation.tweetId,
    feedId: moderation.feedId,
    adminId: moderation.adminId,
    action: moderation.action,
    note: moderation.note,
    createdAt: moderation.timestamp.toISOString(),
  });
}

export async function getModerationHistory(
  db: BetterSQLite3Database,
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
    .orderBy(moderationHistory.createdAt)
    .all();

  return results.map((result) => ({
    tweetId: result.tweetId,
    feedId: result.feedId,
    adminId: result.adminId,
    action: result.action as "approve" | "reject",
    note: result.note,
    timestamp: new Date(result.createdAt),
    moderationResponseTweetId: result.moderationResponseTweetId ?? undefined,
  }));
}

export async function updateSubmissionFeedStatus(
  db: BetterSQLite3Database,
  submissionId: string,
  feedId: string,
  status: SubmissionStatus,
  moderationResponseTweetId: string,
) {
  return db
    .update(submissionFeeds)
    .set({
      status,
      moderationResponseTweetId,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(submissionFeeds.submissionId, submissionId),
        eq(submissionFeeds.feedId, feedId),
      ),
    );
}

export async function getSubmissionByCuratorTweetId(
  db: BetterSQLite3Database,
  curatorTweetId: string,
): Promise<TwitterSubmission | null> {
  const results = (await db
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
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
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
    .orderBy(moderationHistory.createdAt)
    .all()) as DbQueryResult[];

  if (!results.length) return null;

  // Group moderation history
  const modHistory: Moderation[] = results
    .filter((r: DbQueryResult) => r.m && r.m.adminId !== null)
    .map((r: DbQueryResult) => ({
      tweetId: results[0].s.tweetId,
      feedId: r.m.feedId!,
      adminId: r.m.adminId!,
      action: r.m.action as "approve" | "reject",
      note: r.m.note,
      timestamp: new Date(r.m.createdAt!),
      moderationResponseTweetId: r.m.moderationResponseTweetId ?? undefined,
    }));

  return {
    tweetId: results[0].s.tweetId,
    userId: results[0].s.userId,
    username: results[0].s.username,
    content: results[0].s.content,
    curatorNotes: results[0].s.curatorNotes,
    curatorId: results[0].s.curatorId,
    curatorUsername: results[0].s.curatorUsername,
    curatorTweetId: results[0].s.curatorTweetId,
    createdAt: results[0].s.createdAt,
    submittedAt: results[0].s.submittedAt,
    moderationHistory: modHistory,
  };
}

export async function getSubmission(
  db: BetterSQLite3Database,
  tweetId: string,
): Promise<TwitterSubmission | null> {
  const results = (await db
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
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
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
    .orderBy(moderationHistory.createdAt)
    .all()) as DbQueryResult[];

  if (!results.length) return null;

  // Group moderation history
  const modHistory: Moderation[] = results
    .filter((r: DbQueryResult) => r.m && r.m.adminId !== null)
    .map((r: DbQueryResult) => ({
      tweetId,
      feedId: r.m.feedId!,
      adminId: r.m.adminId!,
      action: r.m.action as "approve" | "reject",
      note: r.m.note,
      timestamp: new Date(r.m.createdAt!),
      moderationResponseTweetId: r.m.moderationResponseTweetId ?? undefined,
    }));

  return {
    tweetId: results[0].s.tweetId,
    userId: results[0].s.userId,
    username: results[0].s.username,
    content: results[0].s.content,
    curatorNotes: results[0].s.curatorNotes,
    curatorId: results[0].s.curatorId,
    curatorUsername: results[0].s.curatorUsername,
    curatorTweetId: results[0].s.curatorTweetId,
    createdAt: results[0].s.createdAt,
    submittedAt: results[0].s.submittedAt,
    moderationHistory: modHistory,
  };
}

export async function getAllSubmissions(
  db: BetterSQLite3Database,
  limit: number = 50,
  offset: number = 0,
): Promise<TwitterSubmission[]> {
  const results = (await db
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
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
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
    .orderBy(moderationHistory.createdAt)
    .limit(limit)
    .offset(offset)
    .all()) as DbQueryResult[];

  // Group results by submission
  const submissionMap = new Map<string, TwitterSubmission>();

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
        createdAt: result.s.createdAt,
        submittedAt: result.s.submittedAt,
        moderationHistory: [],
      });
    }

    if (result.m && result.m.adminId !== null) {
      const submission = submissionMap.get(result.s.tweetId)!;
      submission.moderationHistory.push({
        tweetId: result.s.tweetId,
        feedId: result.m.feedId!,
        adminId: result.m.adminId,
        action: result.m.action as "approve" | "reject",
        note: result.m.note,
        timestamp: new Date(result.m.createdAt!),
        moderationResponseTweetId:
          result.m.moderationResponseTweetId ?? undefined,
      });
    }
  }

  return Array.from(submissionMap.values());
}

export async function cleanupOldSubmissionCounts(
  db: BetterSQLite3Database,
  date: string,
) {
  return db
    .delete(submissionCounts)
    .where(sql`${submissionCounts.lastResetDate} < ${date}`);
}

export async function getDailySubmissionCount(
  db: BetterSQLite3Database,
  userId: string,
  date: string,
): Promise<number> {
  const result = await db
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

export async function incrementDailySubmissionCount(
  db: BetterSQLite3Database,
  userId: string,
) {
  const today = new Date().toISOString().split("T")[0];

  return await db
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

export async function removeFromSubmissionFeed(
  db: BetterSQLite3Database,
  submissionId: string,
  feedId: string,
) {
  return await db
    .delete(submissionFeeds)
    .where(
      and(
        eq(submissionFeeds.submissionId, submissionId),
        eq(submissionFeeds.feedId, feedId),
      ),
    );
}

// Feed Plugin queries
export async function getFeedPlugin(
  db: BetterSQLite3Database,
  feedId: string,
  pluginId: string,
) {
  return await db
    .select()
    .from(feedPlugins)
    .where(
      and(eq(feedPlugins.feedId, feedId), eq(feedPlugins.pluginId, pluginId)),
    )
    .get();
}

export async function upsertFeedPlugin(
  db: BetterSQLite3Database,
  feedId: string,
  pluginId: string,
  config: Record<string, any>,
) {
  return await db
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

export async function getSubmissionsByFeed(
  db: BetterSQLite3Database,
  feedId: string,
): Promise<
  (TwitterSubmission & {
    status: SubmissionStatus;
    moderationResponseTweetId?: string;
  })[]
> {
  const results = (await db
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
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
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
    .orderBy(moderationHistory.createdAt)
    .all()) as DbFeedQueryResult[];

  // Group results by submission
  const submissionMap = new Map<string, TwitterSubmissionWithFeedData>();

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
        createdAt: result.s.createdAt,
        submittedAt: result.s.submittedAt,
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
        adminId: result.m.adminId,
        action: result.m.action as "approve" | "reject",
        note: result.m.note,
        timestamp: new Date(result.m.createdAt!),
        moderationResponseTweetId:
          result.m.moderationResponseTweetId ?? undefined,
      });
    }
  }

  return Array.from(submissionMap.values());
}
