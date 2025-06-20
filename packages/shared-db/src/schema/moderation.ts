import { relations } from "drizzle-orm";
import { index, serial, pgTable as table, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { timestamps } from "./common";
import { feeds } from "./feeds";
import { submissions } from "./submissions";

export const moderationActionSchema = z.enum(["approve", "reject"]);
export type ModerationAction = z.infer<typeof moderationActionSchema>;

export const moderationHistory = table(
  "moderation_history",
  {
    id: serial("id").primaryKey(),
    tweetId: text("tweet_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(), // e.g., 'approve', 'reject'
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("moderation_history_tweet_idx").on(table.tweetId),
    index("moderation_history_admin_idx").on(table.adminId),
    index("moderation_history_feed_idx").on(table.feedId),
  ],
);

export const moderationHistoryRelations = relations(
  moderationHistory,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [moderationHistory.tweetId],
      references: [submissions.tweetId],
      relationName: "SubmissionModerationHistory", // This relation name should match the one in submissions.ts
    }),
    feed: one(feeds, {
      fields: [moderationHistory.feedId],
      references: [feeds.id],
      relationName: "ModerationHistoryFeedReference",
    }),
  }),
);

export const insertModerationHistorySchema = createInsertSchema(
  moderationHistory,
  {
    id: z.undefined(),
    createdAt: z.undefined(),
    updatedAt: z.undefined(),
  },
);

export const selectModerationHistorySchema = createSelectSchema(
  moderationHistory,
  {
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  },
);

export type InsertModerationHistory = z.infer<
  typeof insertModerationHistorySchema
>;
export type SelectModerationHistory = z.infer<
  typeof selectModerationHistorySchema
>;
