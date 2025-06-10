import { and, eq } from "drizzle-orm";
import * as schema from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB, InsertFeedRecapState, SelectFeedRecapState } from "../validators";

/**
 * Repository for feed recap state-related database operations
 */
export class FeedRecapRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

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
