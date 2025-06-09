import { index, pgTable as table, serial, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { feeds } from "./feeds";
import { submissions } from "./submissions";
import { timestamps } from "./common";

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
