import { and, eq } from "drizzle-orm";
import * as schema from "../schema";
import { InsertFeedRecapState, SelectFeedRecapState } from "../schema";
import type { DB } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

/**
 * Repository for feed recap state-related database operations
 */
export class FeedRecapRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get a feed recap state by feed ID and recap ID
   * @param feedId The feed ID
   * @param recapId The recap ID
   * @returns The feed recap state or null if not found
   */
  async getRecapState(
    feedId: string,
    recapId: string,
  ): Promise<SelectFeedRecapState | null> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(schema.feedRecapsState)
            .where(
              and(
                eq(schema.feedRecapsState.feedId, feedId),
                eq(schema.feedRecapsState.recapId, recapId),
              ),
            )
            .limit(1);
          return result.length > 0 ? result[0] : null;
        }, this.db),
      {
        operationName: "getRecapState",
        additionalContext: { feedId, recapId },
      },
      null,
    );
  }

  /**
   * Get all recap states for a feed
   * @param feedId The feed ID
   * @returns Array of feed recap states
   */
  async getAllRecapStatesForFeed(
    feedId: string,
  ): Promise<SelectFeedRecapState[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          return dbInstance
            .select()
            .from(schema.feedRecapsState)
            .where(eq(schema.feedRecapsState.feedId, feedId));
        }, this.db),
      {
        operationName: "getAllRecapStatesForFeed",
        additionalContext: { feedId },
      },
      [],
    );
  }

  /**
   * Create or update a feed recap state
   * @param data The feed recap state data to insert or update
   * @param txDb Transaction DB instance
   * @returns The created or updated feed recap state
   */
  async upsertRecapState(
    data: InsertFeedRecapState,
    txDb: DB,
  ): Promise<SelectFeedRecapState> {
    return withErrorHandling(
      async () => {
        const existing = await txDb
          .select()
          .from(schema.feedRecapsState)
          .where(
            and(
              eq(schema.feedRecapsState.feedId, data.feedId),
              eq(schema.feedRecapsState.recapId, data.recapId),
            ),
          )
          .limit(1);

        const now = new Date();

        if (existing.length > 0) {
          const updated = await txDb
            .update(schema.feedRecapsState)
            .set({
              externalJobId: data.externalJobId,
              lastSuccessfulCompletion: data.lastSuccessfulCompletion,
              lastRunError: data.lastRunError,
              updatedAt: now,
            })
            .where(eq(schema.feedRecapsState.id, existing[0].id))
            .returning();
          return updated[0];
        } else {
          const inserted = await txDb
            .insert(schema.feedRecapsState)
            .values({
              feedId: data.feedId,
              recapId: data.recapId,
              externalJobId: data.externalJobId,
              lastSuccessfulCompletion: data.lastSuccessfulCompletion,
              lastRunError: data.lastRunError,
            })
            .returning();
          return inserted[0];
        }
      },
      { operationName: "upsertRecapState", additionalContext: { data } },
    );
  }

  /**
   * Delete a feed recap state
   * @param feedId The feed ID
   * @param recapId The recap ID
   * @param txDb Transaction DB instance
   */
  async deleteRecapState(
    feedId: string,
    recapId: string,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .delete(schema.feedRecapsState)
          .where(
            and(
              eq(schema.feedRecapsState.feedId, feedId),
              eq(schema.feedRecapsState.recapId, recapId),
            ),
          );
      },
      {
        operationName: "deleteRecapState",
        additionalContext: { feedId, recapId },
      },
    );
  }

  /**
   * Delete all recap states for a feed
   * @param feedId The feed ID
   * @param txDb Transaction DB instance
   */
  async deleteRecapStatesForFeed(feedId: string, txDb: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .delete(schema.feedRecapsState)
          .where(eq(schema.feedRecapsState.feedId, feedId));
      },
      {
        operationName: "deleteRecapStatesForFeed",
        additionalContext: { feedId },
      },
    );
  }

  /**
   * Update the completion timestamp for a feed recap
   * @param feedId The feed ID
   * @param recapId The recap ID
   * @param timestamp The completion timestamp
   * @param txDb Transaction DB instance
   */
  async updateRecapCompletion(
    feedId: string,
    recapId: string,
    timestamp: Date,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .update(schema.feedRecapsState)
          .set({
            lastSuccessfulCompletion: timestamp,
            lastRunError: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.feedRecapsState.feedId, feedId),
              eq(schema.feedRecapsState.recapId, recapId),
            ),
          );
      },
      {
        operationName: "updateRecapCompletion",
        additionalContext: { feedId, recapId, timestamp },
      },
    );
  }

  /**
   * Update the error message for a feed recap
   * @param feedId The feed ID
   * @param recapId The recap ID
   * @param errorMsg The error message
   * @param txDb Transaction DB instance
   */
  async updateRecapError(
    feedId: string,
    recapId: string,
    errorMsg: string,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .update(schema.feedRecapsState)
          .set({
            lastRunError: errorMsg,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.feedRecapsState.feedId, feedId),
              eq(schema.feedRecapsState.recapId, recapId),
            ),
          );
      },
      {
        operationName: "updateRecapError",
        additionalContext: { feedId, recapId, errorMsg },
      },
    );
  }
}
