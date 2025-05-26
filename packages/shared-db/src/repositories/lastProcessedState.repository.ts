import { and, eq } from "drizzle-orm";
import {
  LastProcessedState,
  lastProcessedStateTable,
  PlatformState,
  type NewLastProcessedStateSchema,
} from "../schema/lastProcessedState";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

export class LastProcessedStateRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async getState<T extends PlatformState>(
    feedId: string,
    sourcePluginName: string,
    searchId: string,
  ): Promise<LastProcessedState<T> | null> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (retryDb) => {
          const result = await retryDb
            .select({ stateJson: lastProcessedStateTable.stateJson })
            .from(lastProcessedStateTable)
            .where(
              and(
                eq(lastProcessedStateTable.feedId, feedId),
                eq(lastProcessedStateTable.sourcePluginName, sourcePluginName),
                eq(lastProcessedStateTable.searchId, searchId),
              ),
            )
            .limit(1);

          if (result.length === 0) {
            return null;
          }
          return result[0].stateJson as LastProcessedState<T>;
        }, this.db),
      {
        operationName: "getState",
        additionalContext: { feedId, sourcePluginName, searchId },
      },
      null,
    );
  }

  async saveState<T extends PlatformState>(
    feedId: string,
    sourcePluginName: string,
    searchId: string,
    state: LastProcessedState<T>,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const values: NewLastProcessedStateSchema = {
          feedId,
          sourcePluginName,
          searchId,
          stateJson: state, // Drizzle handles JSON stringification
        };

        await txDb
          .insert(lastProcessedStateTable)
          .values(values)
          .onConflictDoUpdate({
            target: [
              lastProcessedStateTable.feedId,
              lastProcessedStateTable.sourcePluginName,
              lastProcessedStateTable.searchId,
            ],
            set: {
              stateJson: values.stateJson,
              // Consider adding an updatedAt field here if your table has one
            },
          });
      },
      {
        operationName: "saveState",
        additionalContext: {
          feedId,
          sourcePluginName,
          searchId /* state can be large */,
        },
      },
    );
  }

  async deleteState(
    feedId: string,
    sourcePluginName: string,
    searchId: string,
    txDb: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        await txDb
          .delete(lastProcessedStateTable)
          .where(
            and(
              eq(lastProcessedStateTable.feedId, feedId),
              eq(lastProcessedStateTable.sourcePluginName, sourcePluginName),
              eq(lastProcessedStateTable.searchId, searchId),
            ),
          );
      },
      {
        operationName: "deleteState",
        additionalContext: { feedId, sourcePluginName, searchId },
      },
    );
  }
}
