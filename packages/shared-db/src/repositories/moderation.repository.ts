import { and, asc, eq } from "drizzle-orm";
import * as schema from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import {
  DB,
  InsertModerationHistory,
  SelectModerationHistory,
} from "../validators";

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
  ): Promise<void> {
    const dbInstance = txDb || this.db;
    return withErrorHandling(
      async () => {
        await dbInstance
          .insert(schema.moderationHistory) // Use the imported moderationHistory schema
          .values({
            // Ensure all fields from InsertModerationHistory are covered
            tweetId: moderation.tweetId,
            feedId: moderation.feedId,
            adminId: moderation.adminId,
            action: moderation.action,
            note: moderation.note,
            createdAt: moderation.createdAt || new Date(), // Default to now if not provided
            // updatedAt will be handled by DB or triggers if set up, or manually
          })
          .execute();
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
        const result = await executeWithRetry(
          (retryDb) =>
            retryDb.query.moderationHistory.findFirst({
              where: eq(schema.moderationHistory.id, id),
            }),
          this.db,
        );
        return result ? (result as SelectModerationHistory) : null;
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
        const results = await executeWithRetry(
          (retryDb) =>
            retryDb.query.moderationHistory.findMany({
              where: eq(schema.moderationHistory.tweetId, submissionId),
              orderBy: [asc(schema.moderationHistory.createdAt)],
            }),
          this.db,
        );
        return results as SelectModerationHistory[];
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
        const results = await executeWithRetry(
          (retryDb) =>
            retryDb.query.moderationHistory.findMany({
              where: and(
                eq(schema.moderationHistory.tweetId, submissionId),
                eq(schema.moderationHistory.feedId, feedId),
              ),
              orderBy: [asc(schema.moderationHistory.createdAt)],
            }),
          this.db,
        );
        return results as SelectModerationHistory[];
      },
      {
        operationName: "get moderations by submission and feed ID",
        additionalContext: { submissionId, feedId },
      },
      [],
    );
  }
}
