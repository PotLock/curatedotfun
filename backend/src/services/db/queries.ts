import { and, eq, sql } from "drizzle-orm";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import {
  Submission,
  SubmissionWithFeedData,
  SubmissionFeed,
  ModerationAction,
  SubmissionStatus,
} from "../../types/submission";
import {
  feedPlugins,
  feeds,
  moderationHistory,
  submissionCounts,
  submissionFeeds,
  submissions,
} from "./schema";
import { DbQueryResult, DbFeedQueryResult } from "./types";

export function upsertFeeds(
  db: BunSQLiteDatabase,
  feedsToUpsert: { id: string; name: string; description?: string }[],
) {
  return db.transaction(() => {
    for (const feed of feedsToUpsert) {
      db.insert(feeds)
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
        })
        .run();
    }
  });
}

export function saveSubmissionToFeed(
  db: BunSQLiteDatabase,
  submissionId: string,
  feedId: string,
  status: SubmissionStatus = SubmissionStatus.PENDING,
) {
  return db
    .insert(submissionFeeds)
    .values({
      submissionId,
      feedId,
      status,
    })
    .onConflictDoNothing();
}

export function getFeedsBySubmission(
  db: BunSQLiteDatabase,
  submissionId: string,
): SubmissionFeed[] {
  const results = db
    .select({
      submissionId: submissionFeeds.submissionId,
      feedId: submissionFeeds.feedId,
      status: submissionFeeds.status,
      metadata: submissionFeeds.metadata,
    })
    .from(submissionFeeds)
    .where(eq(submissionFeeds.submissionId, submissionId))
    .all();

  return results.map((result) => ({
    ...result,
    metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
  }));
}

export function saveSubmission(
  db: BunSQLiteDatabase,
  submission: Omit<Submission, "moderationHistory">,
) {
  return db.insert(submissions).values({
    id: submission.id,
    data: JSON.stringify(submission.data),
    metadata: JSON.stringify(submission.metadata),
    createdAt: submission.createdAt,
    submittedAt: submission.submittedAt,
  });
}

export function saveModerationAction(
  db: BunSQLiteDatabase,
  moderation: ModerationAction,
) {
  return db.insert(moderationHistory).values({
    submissionId: moderation.submissionId,
    feedId: moderation.feedId,
    action: moderation.action,
    metadata: moderation.metadata ? JSON.stringify(moderation.metadata) : null,
    note: moderation.note ?? null,
    createdAt: moderation.timestamp.toISOString(),
  });
}

export function getModerationHistory(
  db: BunSQLiteDatabase,
  submissionId: string,
): ModerationAction[] {
  const results = db
    .select({
      submissionId: moderationHistory.submissionId,
      feedId: moderationHistory.feedId,
      action: moderationHistory.action,
      metadata: moderationHistory.metadata,
      note: moderationHistory.note,
      createdAt: moderationHistory.createdAt,
    })
    .from(moderationHistory)
    .leftJoin(
      submissionFeeds,
      and(
        eq(moderationHistory.submissionId, submissionFeeds.submissionId),
        eq(moderationHistory.feedId, submissionFeeds.feedId),
      ),
    )
    .where(eq(moderationHistory.submissionId, submissionId))
    .orderBy(moderationHistory.createdAt)
    .all();

  return results.map((result) => ({
    submissionId: result.submissionId!,
    feedId: result.feedId!,
    action: result.action as "approve" | "reject",
    note: result.note ?? undefined,
    timestamp: new Date(result.createdAt!),
    metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
  }));
}

export function updateSubmissionFeedStatus(
  db: BunSQLiteDatabase,
  submissionId: string,
  feedId: string,
  status: SubmissionStatus,
  metadata?: Record<string, any>,
) {
  return db
    .update(submissionFeeds)
    .set({
      status,
      metadata: metadata ? JSON.stringify(metadata) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(submissionFeeds.submissionId, submissionId),
        eq(submissionFeeds.feedId, feedId),
      ),
    );
}

export function getSubmission(
  db: BunSQLiteDatabase,
  id: string,
): Submission | null {
  const results = db
    .select({
      s: {
        id: submissions.id,
        data: submissions.data,
        metadata: submissions.metadata,
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      },
      m: {
        submissionId: moderationHistory.submissionId,
        action: moderationHistory.action,
        metadata: moderationHistory.metadata,
        note: moderationHistory.note,
        createdAt: moderationHistory.createdAt,
        feedId: moderationHistory.feedId,
      },
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.id, moderationHistory.submissionId),
    )
    .leftJoin(
      submissionFeeds,
      and(
        eq(submissions.id, submissionFeeds.submissionId),
        eq(moderationHistory.feedId, submissionFeeds.feedId),
      ),
    )
    .where(eq(submissions.id, id))
    .orderBy(moderationHistory.createdAt)
    .all() as DbQueryResult[];

  if (!results.length) return null;

  // Group moderation history
  const modHistory: ModerationAction[] = results
    .filter((r: DbQueryResult) => r.m?.action !== null)
    .map((r: DbQueryResult) => {
      // We know r.m is not null here because of the filter
      const mod = r.m!;
      return {
        submissionId: id,
        feedId: mod.feedId!,
        action: mod.action as "approve" | "reject",
        note: mod.note ?? undefined,
        timestamp: new Date(mod.createdAt!),
        metadata: mod.metadata ? JSON.parse(mod.metadata) : undefined,
      };
    });

  return {
    id: results[0].s.id,
    data: JSON.parse(results[0].s.data),
    metadata: JSON.parse(results[0].s.metadata),
    createdAt: results[0].s.createdAt,
    submittedAt: results[0].s.submittedAt,
    moderationHistory: modHistory,
  };
}

export function getAllSubmissions(db: BunSQLiteDatabase): Submission[] {
  const results = db
    .select({
      s: {
        id: submissions.id,
        data: submissions.data,
        metadata: submissions.metadata,
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      },
      m: {
        submissionId: moderationHistory.submissionId,
        action: moderationHistory.action,
        metadata: moderationHistory.metadata,
        note: moderationHistory.note,
        createdAt: moderationHistory.createdAt,
        feedId: moderationHistory.feedId,
      },
    })
    .from(submissions)
    .leftJoin(
      moderationHistory,
      eq(submissions.id, moderationHistory.submissionId),
    )
    .leftJoin(
      submissionFeeds,
      and(
        eq(submissions.id, submissionFeeds.submissionId),
        eq(moderationHistory.feedId, submissionFeeds.feedId),
      ),
    )
    .orderBy(moderationHistory.createdAt)
    .all() as DbQueryResult[];

  // Group results by submission
  const submissionMap = new Map<string, Submission>();

  for (const result of results) {
    if (!submissionMap.has(result.s.id)) {
      submissionMap.set(result.s.id, {
        id: result.s.id,
        data: JSON.parse(result.s.data),
        metadata: JSON.parse(result.s.metadata),
        createdAt: result.s.createdAt,
        submittedAt: result.s.submittedAt,
        moderationHistory: [],
      });
    }

    if (result.m?.action !== null) {
      const submission = submissionMap.get(result.s.id)!;
      const mod = result.m;
      if (mod) {
        submission.moderationHistory.push({
          submissionId: result.s.id,
          feedId: mod.feedId!,
          action: mod.action as "approve" | "reject",
          note: mod.note ?? undefined,
          timestamp: new Date(mod.createdAt!),
          metadata: mod.metadata ? JSON.parse(mod.metadata) : undefined,
        });
      }
    }
  }

  return Array.from(submissionMap.values());
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
      and(eq(feedPlugins.feedId, feedId), eq(feedPlugins.pluginId, pluginId)),
    )
    .get();
}

export function upsertFeedPlugin(
  db: BunSQLiteDatabase,
  feedId: string,
  pluginId: string,
  config: Record<string, any>,
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
): SubmissionWithFeedData[] {
  const results = db
    .select({
      s: {
        id: submissions.id,
        data: submissions.data,
        metadata: submissions.metadata,
        createdAt: submissions.createdAt,
        submittedAt: sql<string>`COALESCE(${submissions.submittedAt}, ${submissions.createdAt})`,
      },
      sf: {
        status: submissionFeeds.status,
        metadata: submissionFeeds.metadata,
      },
      m: {
        submissionId: moderationHistory.submissionId,
        action: moderationHistory.action,
        metadata: moderationHistory.metadata,
        note: moderationHistory.note,
        createdAt: moderationHistory.createdAt,
        feedId: moderationHistory.feedId,
      },
    })
    .from(submissions)
    .innerJoin(
      submissionFeeds,
      eq(submissions.id, submissionFeeds.submissionId),
    )
    .leftJoin(
      moderationHistory,
      eq(submissions.id, moderationHistory.submissionId),
    )
    .where(eq(submissionFeeds.feedId, feedId))
    .orderBy(moderationHistory.createdAt)
    .all() as DbFeedQueryResult[];

  // Group results by submission
  const submissionMap = new Map<string, SubmissionWithFeedData>();

  for (const result of results) {
    if (!submissionMap.has(result.s.id)) {
      submissionMap.set(result.s.id, {
        id: result.s.id,
        data: JSON.parse(result.s.data),
        metadata: JSON.parse(result.s.metadata),
        createdAt: result.s.createdAt,
        submittedAt: result.s.submittedAt,
        moderationHistory: [],
        status: result.sf.status,
      });
    }

    if (result.m?.action !== null) {
      const submission = submissionMap.get(result.s.id)!;
      const mod = result.m;
      if (mod) {
        submission.moderationHistory.push({
          submissionId: result.s.id,
          feedId: mod.feedId!,
          action: mod.action as "approve" | "reject",
          note: mod.note ?? undefined,
          timestamp: new Date(mod.createdAt!),
          metadata: mod.metadata ? JSON.parse(mod.metadata) : undefined,
        });
      }
    }
  }

  return Array.from(submissionMap.values());
}
