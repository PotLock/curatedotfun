import type { FeedConfig } from "@curatedotfun/types";
import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  primaryKey,
  serial,
  pgTable as table,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { timestamps } from "./common";
import { moderationHistory } from "./moderation";
import { processingJobs } from "./processing";
import { submissionFeeds } from "./submissions";
import { users } from "./users";

// Feeds Table
// Stores the entire feed configuration as JSONB
export const feeds = table(
  "feeds",
  {
    id: text("id").primaryKey(), // (hashtag)
    // Store the entire configuration as JSONB
    config: jsonb("config").$type<FeedConfig>().notNull(), // This should be FeedConfig
    // Keep these fields for backward compatibility and quick lookups
    name: text("name").notNull(),
    description: text("description"),
    createdBy: text("created_by")
      // .notNull() // for now
      .references(() => users.nearAccountId, { onDelete: "cascade" }),
    admins: jsonb("admins")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  () => [check("id_lowercase_check", sql`id = lower(id)`)],
);

// RELATIONS for feeds table
export const feedsRelations = relations(feeds, ({ one, many }) => ({
  creator: one(users, {
    fields: [feeds.createdBy],
    references: [users.nearAccountId],
    relationName: "FeedCreator",
  }),
  submissionLinks: many(submissionFeeds, {
    relationName: "FeedSubmissionLinks",
  }),
  moderationHistoryEntries: many(moderationHistory, {
    relationName: "ModerationHistoryFeedReference",
  }),
  processingJobs: many(processingJobs, {
    relationName: "FeedProcessingJobs",
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

export const insertFeedSchema = createInsertSchema(feeds, {
  id: z
    .string()
    .min(1)
    .transform((s) => s.toLowerCase()),
  createdBy: z.string().min(1),
  admins: z.array(z.string()).optional(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const updateFeedSchema = createUpdateSchema(feeds).extend({
  admins: z.array(z.string()).optional(),
});

export const selectFeedSchema = createSelectSchema(feeds);
export type InsertFeed = z.infer<typeof insertFeedSchema>;
export type UpdateFeed = z.infer<typeof updateFeedSchema>;
export type SelectFeed = z.infer<typeof selectFeedSchema>;

// FeedRecapsState Schemas and Types
export const insertFeedRecapStateSchema = createInsertSchema(feedRecapsState, {
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateFeedRecapStateSchema = createUpdateSchema(feedRecapsState);
export const selectFeedRecapStateSchema = createSelectSchema(feedRecapsState);
export type InsertFeedRecapState = z.infer<typeof insertFeedRecapStateSchema>;
export type UpdateFeedRecapState = z.infer<typeof updateFeedRecapStateSchema>;
export type SelectFeedRecapState = z.infer<typeof selectFeedRecapStateSchema>;

// FeedPlugins Schemas and Types
export const insertFeedPluginSchema = createInsertSchema(feedPlugins, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateFeedPluginSchema = createUpdateSchema(feedPlugins);
export const selectFeedPluginSchema = createSelectSchema(feedPlugins);
export type InsertFeedPlugin = z.infer<typeof insertFeedPluginSchema>;
export type UpdateFeedPlugin = z.infer<typeof updateFeedPluginSchema>;
export type SelectFeedPlugin = z.infer<typeof selectFeedPluginSchema>;
