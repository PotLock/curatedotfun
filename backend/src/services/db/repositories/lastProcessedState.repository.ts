import type { LastProcessedState, PlatformState } from '@curatedotfun/types';
import { and, eq } from 'drizzle-orm';
import { lastProcessedStateTable, type NewLastProcessedStateSchema } from '../schema/lastProcessedState';
import { executeOperation, withDatabaseErrorHandling } from '../transaction';

export class LastProcessedStateRepository {
  async getState<T extends PlatformState>(
    feedId: string,
    sourcePluginName: string,
    searchId: string
  ): Promise<LastProcessedState<T> | null> {
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          const result = await db
            .select({ stateJson: lastProcessedStateTable.stateJson })
            .from(lastProcessedStateTable)
            .where(
              and(
                eq(lastProcessedStateTable.feedId, feedId),
                eq(lastProcessedStateTable.sourcePluginName, sourcePluginName),
                eq(lastProcessedStateTable.searchId, searchId)
              )
            )
            .limit(1);

          if (result.length === 0) {
            return null;
          }
          return result[0].stateJson as LastProcessedState<T>;
        });
      },
      { operationName: 'getLastProcessedState' }
    );
  }

  async saveState<T extends PlatformState>(
    feedId: string,
    sourcePluginName: string,
    searchId: string,
    state: LastProcessedState<T>
  ): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          const values: NewLastProcessedStateSchema = {
            feedId,
            sourcePluginName,
            searchId,
            stateJson: state,
          };

          await db
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
              },
            });
        });
      },
      { operationName: 'saveLastProcessedState' }
    );
  }

  async deleteState(
    feedId: string,
    sourcePluginName: string,
    searchId: string
  ): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          await db
            .delete(lastProcessedStateTable)
            .where(
              and(
                eq(lastProcessedStateTable.feedId, feedId),
                eq(lastProcessedStateTable.sourcePluginName, sourcePluginName),
                eq(lastProcessedStateTable.searchId, searchId)
              )
            );
        });
      },
      { operationName: 'deleteLastProcessedState' }
    );
  }
}

export const lastProcessedStateRepository = new LastProcessedStateRepository();
