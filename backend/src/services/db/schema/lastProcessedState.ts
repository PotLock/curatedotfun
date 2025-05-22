import type { LastProcessedState } from '@curatedotfun/types';
import { jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export const lastProcessedStateTable = pgTable(
  'last_processed_state',
  {
    feedId: text('feed_id').notNull(),
    sourcePluginName: text('source_plugin_name').notNull(),
    searchId: text('search_id').notNull(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stateJson: jsonb('state_json').notNull().$type<LastProcessedState<any>>(), // Use 'any' for PlatformState within DB type
  },
  (table) => {
    return [
      primaryKey({
        columns: [table.feedId, table.sourcePluginName, table.searchId],
      }),
    ];
  }
);

export type LastProcessedStateSchema = typeof lastProcessedStateTable.$inferSelect;
export type NewLastProcessedStateSchema = typeof lastProcessedStateTable.$inferInsert;
