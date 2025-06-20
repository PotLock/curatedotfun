import { and, asc, eq } from "drizzle-orm";
import {
  InsertModerationHistory,
  moderationHistory,
  SelectModerationHistory,
} from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

/**
 * Repository for moderation-related database operations.
 */
export class ModerationRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Saves a moderation action to the database.
   * This method was originally in SubmissionRepository.
   */
  async saveModerationAction(
    moderation: InsertModerationHistory,
    txDb?: DB, // Optional transaction DB
  ): Promise<SelectModerationHistory> {
    const dbInstance = txDb || this.db;
    return withErrorHandling(
      async () => {
        const insertResult = await dbInstance
          .insert(moderationHistory)
          .values(moderation)
          .returning();

        const newModeration = insertResult[0];
        if (!newModeration) {
          throw new Error("Failed to insert moderation history into database");
        }
        return newModeration;
      },
      {
        operationName: "save moderation action",
        additionalContext: {
          tweetId: moderation.tweetId,
          feedId: moderation.feedId,
          action: moderation.action,
        },
      },
    );
  }

  /**
   * Retrieves a specific moderation entry by its ID.
   */
  async getModerationById(id: number): Promise<SelectModerationHistory | null> {
    return withErrorHandling(
      async () => {
        const result = await executeWithRetry(async (dbInstance) => {
          const res = await dbInstance
            .select()
            .from(moderationHistory)
            .where(eq(moderationHistory.id, id))
            .limit(1);
          return res.length > 0 ? res[0] : null;
        }, this.db);
        return result;
      },
      {
        operationName: "get moderation by ID",
        additionalContext: { id },
      },
      null,
    );
  }

  /**
   * Retrieves all moderation entries for a given submission ID, ordered by creation date.
   */
  async getModerationsBySubmissionId(
    submissionId: string,
  ): Promise<SelectModerationHistory[]> {
    return withErrorHandling(
      async () => {
        const results = await executeWithRetry(async (dbInstance) => {
          return await dbInstance
            .select()
            .from(moderationHistory)
            .where(eq(moderationHistory.tweetId, submissionId))
            .orderBy(asc(moderationHistory.createdAt));
        }, this.db);
        return results;
      },
      {
        operationName: "get moderations by submission ID",
        additionalContext: { submissionId },
      },
      [],
    );
  }

  /**
   * Retrieves all moderation entries for a specific submission within a particular feed, ordered by creation date.
   */
  async getModerationsBySubmissionFeed(
    submissionId: string,
    feedId: string,
  ): Promise<SelectModerationHistory[]> {
    return withErrorHandling(
      async () => {
        const results = await executeWithRetry(async (dbInstance) => {
          return await dbInstance
            .select()
            .from(moderationHistory)
            .where(
              and(
                eq(moderationHistory.tweetId, submissionId),
                eq(moderationHistory.feedId, feedId),
              ),
            )
            .orderBy(asc(moderationHistory.createdAt));
        }, this.db);
        return results;
      },
      {
        operationName: "get moderations by submission and feed ID",
        additionalContext: { submissionId, feedId },
      },
      [],
    );
  }
}
