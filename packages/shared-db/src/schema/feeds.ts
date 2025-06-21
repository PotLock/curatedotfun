import type { FeedConfig } from "@curatedotfun/types";
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
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

// Feeds Table
// Stores the entire feed configuration as JSONB
export const feeds = table("feeds", {
  id: text("id").primaryKey(), // (hashtag)
  // Store the entire configuration as JSONB
  config: jsonb("config").$type<FeedConfig>().notNull(), // This should be FeedConfig
  // Keep these fields for backward compatibility and quick lookups
  name: text("name").notNull(),
  description: text("description"),
  created_by: text("created_by")
    // .notNull() // for now
    .references(() => users.nearAccountId, { onDelete: "cascade" }),
  admins: jsonb("admins")
    .$type<string[]>()
    .default(sql`'[]'::jsonb`),
  ...timestamps,
});

// RELATIONS for feeds table
export const feedsRelations = relations(feeds, ({ one, many }) => ({
  creator: one(users, {
    fields: [feeds.created_by],
    references: [users.nearAccountId],
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

export const insertFeedSchema = createInsertSchema(feeds, {
  created_by: z.string().min(1),
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
