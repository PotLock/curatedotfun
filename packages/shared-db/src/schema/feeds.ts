import {
  index,
  jsonb,
  primaryKey,
  serial,
  pgTable as table,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestamps } from "./common";
import { z } from "zod";
import { submissionFeeds } from "./submissions";
import { moderationHistory } from "./moderation";
import { users } from "./users";

// Schema for ModerationConfig
export const ModerationConfigSchema = z.object({
  approvers: z.record(z.string(), z.array(z.string())).optional(),
  // Key is the platform identifier,
  // value is an array of approver usernames or IDs for that platform.
  blacklist: z.record(z.string(), z.array(z.string())).optional(), // e.g. { "twitter": ["user1", "user2"], "all": ["global_spammer"] }

  // TODO: usernames can change, and so we should root in userIds per platform (on feed creation)
});

// Schema for TransformConfig (used in StreamConfig, DistributorConfig, RecapConfig)
export const TransformConfigSchema = z.object({
  plugin: z.string(), // Name/key of the transformer plugin registered in AppConfig.plugins
  config: z.record(z.string(), z.any()),
});

// Schema for DistributorConfig (used in StreamConfig, RecapConfig)
export const DistributorConfigSchema = z.object({
  plugin: z.string(), // Name/key of the distributor plugin registered in AppConfig.plugins
  config: z.record(z.string()), // Config specific to this distributor instance
  transform: z.array(TransformConfigSchema).optional(), // Per-distributor transforms
});

// Schema for StreamConfig (part of FeedConfig.outputs)
export const StreamConfigSchema = z.object({
  enabled: z.boolean(),
  transform: z.array(TransformConfigSchema).optional(), // Global transforms for the stream
  distribute: z.array(DistributorConfigSchema).optional(),
});

// Schema for RecapConfig (using structure from recap.ts)
export const RecapConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  schedule: z.string(), // Cron expression or interval
  timezone: z.string().optional(),
  transform: z.array(TransformConfigSchema).optional(),
  batchTransform: z.array(TransformConfigSchema).optional(),
  distribute: z.array(DistributorConfigSchema).optional(),
});

// Schema for individual search configuration within a source
export const SourceSearchConfigSchema = z
  .object({
    searchId: z.string(), // Unique ID for this search block to manage its state
    type: z.string(), // Type of search within the plugin (e.g., "twitter-scraper", "reddit-posts")
    query: z.string().optional(), // General query string
    pageSize: z.number().int().positive().optional(),
    language: z.string().optional(), // e.g., "en", "es"
    platformArgs: z.record(z.string(), z.any()).optional(),
    // Allow other dynamic properties
  })
  .catchall(z.any());

// Schema for SourceConfig (part of FeedConfig)
export const SourceConfigSchema = z.object({
  plugin: z.string(), // Name/key of the source plugin registered in AppConfig.plugins
  // Config for the source plugin instance itself (e.g., API keys, base URLs)
  // This 'config' is passed to the plugin's initialize method.
  config: z.record(z.string(), z.any()).optional(),
  // Array of search configurations for this source instance in this feed.
  // Each object defines a specific query/task for the source plugin.
  search: z.array(SourceSearchConfigSchema),
});

// Schema for feed ingestion scheduling
export const IngestionConfigSchema = z.object({
  enabled: z.boolean().default(false).optional(),
  schedule: z.string().min(1),
});

export const FeedConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().optional().default(true),
  pollingIntervalMs: z.number().int().positive().optional(),
  moderation: ModerationConfigSchema,
  sources: z.array(SourceConfigSchema).optional(),
  ingestion: IngestionConfigSchema.optional(), // Configuration for source ingestion scheduling
  outputs: z.object({
    stream: StreamConfigSchema.optional(),
    recap: z.array(RecapConfigSchema).optional(),
  }),
});

export type StreamConfig = z.infer<typeof StreamConfigSchema>;
export type IngestionConfig = z.infer<typeof IngestionConfigSchema>;
export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;
export type TransformConfig = z.infer<typeof TransformConfigSchema>;
export type DistributorConfig = z.infer<typeof DistributorConfigSchema>;
export type RecapConfig = z.infer<typeof RecapConfigSchema>;
export type SourceSearchConfig = z.infer<typeof SourceSearchConfigSchema>;
export type SourceConfig = z.infer<typeof SourceConfigSchema>;
export type FeedConfig = z.infer<typeof FeedConfigSchema>;

// Feeds Table
// Stores the entire feed configuration as JSONB
export const feeds = table("feeds", {
  id: text("id").primaryKey(), // (hashtag)
  // Store the entire configuration as JSONB
  config: jsonb("config").$type<FeedConfig>().notNull(),
  // Keep these fields for backward compatibility and quick lookups
  name: text("name").notNull(),
  description: text("description"),
  created_by: text("created_by")
    .notNull()
    .references(() => users.near_account_id, { onDelete: "cascade" }),
  admins: jsonb("admins")
    .$type<string[]>()
    .default(sql`'[]'::jsonb`),
  ...timestamps,
});

// RELATIONS for feeds table
export const feedsRelations = relations(feeds, ({ one, many }) => ({
  creator: one(users, {
    fields: [feeds.created_by],
    references: [users.near_account_id],
    relationName: "FeedCreator",
  }),
  submissionLinks: many(submissionFeeds, {
    relationName: "FeedSubmissionLinks",
  }),
  moderationHistoryEntries: many(moderationHistory, {
    relationName: "ModerationHistoryFeedReference",
  }),
}));

// Feed Recaps State Table
// Tracks the state of each recap job
export const feedRecapsState = table(
  "feed_recaps_state",
  {
    id: serial("id").primaryKey(),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    // Unique ID of the recap configuration
    recapId: text("recap_id").notNull(),
    // Unique ID provided by the external scheduler service for this specific job
    externalJobId: text("external_job_id").unique(),
    // Last time the curate backend successfully processed this recap
    lastSuccessfulCompletion: timestamp("last_successful_completion", {
      mode: "date",
      withTimezone: true,
    }),
    // Error message if the last run failed in the curate backend
    lastRunError: text("last_run_error"),
    ...timestamps,
  },
  (table) => [
    // Ensure only one state record per feed/recap ID combination
    uniqueIndex("feed_recap_id_idx").on(table.feedId, table.recapId),
  ],
);

export const feedPlugins = table(
  "feed_plugins",
  {
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    pluginId: text("plugin_id").notNull(),
    config: text("config").notNull(), // JSON string of plugin-specific config
    ...timestamps,
  },
  (table) => [
    index("feed_plugins_feed_idx").on(table.feedId),
    index("feed_plugins_plugin_idx").on(table.pluginId),
    primaryKey({ columns: [table.feedId, table.pluginId] }), // Ensure one config per plugin per feed
  ],
);

