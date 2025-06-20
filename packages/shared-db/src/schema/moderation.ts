import { relations } from "drizzle-orm";
import { index, serial, pgTable as table, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { timestamps } from "./common";
import { feeds } from "./feeds";
import { submissions } from "./submissions";

export const moderationActionSchema = z.enum(["approve", "reject"]);
export type ModerationAction = z.infer<typeof moderationActionSchema>;

export const moderatorAccountIdTypeSchema = z.enum([
  "near",
  "platform_username",
]);
export type ModeratorAccountIdType = z.infer<
  typeof moderatorAccountIdTypeSchema
>;

export const moderationSourceSchema = z.enum([
  "ui",
  "platform_comment",
  "auto_approval",
  "super_admin_direct",
]);
export type ModerationSource = z.infer<typeof moderationSourceSchema>;

export const moderationHistory = table(
  "moderation_history",
  {
    id: serial("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    moderatorAccountId: text("moderator_account_id").notNull(),
    moderatorAccountIdType: text("moderator_account_id_type").notNull(),
    source: text("source").notNull(),
    action: text("action").notNull(), // e.g., 'approve', 'reject'
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("moderation_history_submission_idx").on(table.submissionId),
    index("moderation_history_moderator_account_idx").on(
      table.moderatorAccountId,
    ),
    index("moderation_history_feed_idx").on(table.feedId),
  ],
);

export const moderationHistoryRelations = relations(
  moderationHistory,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [moderationHistory.submissionId],
      references: [submissions.tweetId],
      relationName: "SubmissionModerationHistory",
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
    submissionId: z.string(),
    feedId: z.string(),
    moderatorAccountId: z.string(),
    moderatorAccountIdType: moderatorAccountIdTypeSchema,
    source: moderationSourceSchema,
    action: moderationActionSchema,
    note: z.string().nullable().optional(),

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
    moderatorAccountIdType: moderatorAccountIdTypeSchema,
    source: moderationSourceSchema,
    action: moderationActionSchema,
  },
);

export type InsertModerationHistory = z.infer<
  typeof insertModerationHistorySchema
>;
export type SelectModerationHistory = z.infer<
  typeof selectModerationHistorySchema
>;
