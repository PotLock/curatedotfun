import { jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

/**
 * Defines the progress of a job submitted to an external asynchronous service (e.g., Masa).
 */
export interface AsyncJobProgress {
  jobId: string;
  status: "submitted" | "pending" | "processing" | "done" | "error" | "timeout";
  submittedAt: string; // ISO timestamp
  lastCheckedAt?: string; // ISO timestamp
  errorMessage?: string;
  // Optionally, store the original query or parameters for this job
  // queryDetails?: Record<string, any>;
}

/**
 * Generic platform-specific state for managing resumable searches and long-running jobs.
 * This is the `TData` type for `LastProcessedState`.
 */
export interface PlatformState {
  // For overall resumable search (across multiple jobs/chunks)
  // This cursor can be a string, number, or a more complex object
  // depending on the platform's pagination/cursor mechanism.
  latestProcessedId?: string | number | Record<string, any>;

  // For the currently active job (e.g., a Masa search job for one chunk)
  currentAsyncJob?: AsyncJobProgress | null;

  // Allows for other platform-specific state variables
  [key: string]: any;
}

/**
 * State passed between search calls to enable resumption.
 * TData is expected to be an object conforming to PlatformState or a derivative.
 */
export interface LastProcessedState<
  TData extends PlatformState = PlatformState,
> {
  // The `data` field holds the strongly-typed, platform-specific state.
  data: TData;
  // Optional: A unique identifier for this state object itself, if needed for storage/retrieval.
  // id?: string;
  // Optional: Timestamp of when this state was generated.
  // timestamp?: number;
}

export const lastProcessedStateTable = pgTable(
  "last_processed_state",
  {
    feedId: text("feed_id").notNull(),
    sourcePluginName: text("source_plugin_name").notNull(),
    searchId: text("search_id").notNull(),
    stateJson: jsonb("state_json").notNull().$type<LastProcessedState<any>>(),
  },
  (table) => {
    return [
      primaryKey({
        columns: [table.feedId, table.sourcePluginName, table.searchId],
      }),
    ];
  },
);

export type LastProcessedStateSchema =
  typeof lastProcessedStateTable.$inferSelect;
export type NewLastProcessedStateSchema =
  typeof lastProcessedStateTable.$inferInsert;
