import { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const {
  users,
  activities,
  userStats,
  feedUserStats,
  feeds,
  feedRecapsState,
  feedPlugins,
  submissions,
  submissionFeeds,
  moderationHistory,
  submissionCounts,
  lastProcessedStateTable,
} = schema;

// User Schemas and Types
export const insertUserSchema = createInsertSchema(users);
export const updateUserSchema = createUpdateSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;

// Activity Schemas and Types
export const insertActivitySchema = createInsertSchema(activities);
export const updateActivitySchema = createUpdateSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>;
export type SelectActivity = z.infer<typeof selectActivitySchema>;

// UserStats Schemas and Types
export const insertUserStatsSchema = createInsertSchema(userStats);
export const updateUserStatsSchema = createUpdateSchema(userStats);
export const selectUserStatsSchema = createSelectSchema(userStats);
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UpdateUserStats = z.infer<typeof updateUserStatsSchema>;
export type SelectUserStats = z.infer<typeof selectUserStatsSchema>;

// FeedUserStats Schemas and Types
export const insertFeedUserStatsSchema = createInsertSchema(feedUserStats);
export const updateFeedUserStatsSchema = createUpdateSchema(feedUserStats);
export const selectFeedUserStatsSchema = createSelectSchema(feedUserStats);
export type InsertFeedUserStats = z.infer<typeof insertFeedUserStatsSchema>;
export type UpdateFeedUserStats = z.infer<typeof updateFeedUserStatsSchema>;
export type SelectFeedUserStats = z.infer<typeof selectFeedUserStatsSchema>;

// Feed Schemas and Types
export const insertFeedSchema = createInsertSchema(feeds);
export const updateFeedSchema = createUpdateSchema(feeds);
export const selectFeedSchema = createSelectSchema(feeds);
export type InsertFeed = z.infer<typeof insertFeedSchema>;
export type UpdateFeed = z.infer<typeof updateFeedSchema>;
export type SelectFeed = z.infer<typeof selectFeedSchema>;

// FeedRecapsState Schemas and Types
export const insertFeedRecapStateSchema = createInsertSchema(feedRecapsState);
export const updateFeedRecapStateSchema = createUpdateSchema(feedRecapsState);
export const selectFeedRecapStateSchema = createSelectSchema(feedRecapsState);
export type InsertFeedRecapState = z.infer<typeof insertFeedRecapStateSchema>;
export type UpdateFeedRecapState = z.infer<typeof updateFeedRecapStateSchema>;
export type SelectFeedRecapState = z.infer<typeof selectFeedRecapStateSchema>;

// FeedPlugins Schemas and Types
export const insertFeedPluginSchema = createInsertSchema(feedPlugins);
export const updateFeedPluginSchema = createUpdateSchema(feedPlugins);
export const selectFeedPluginSchema = createSelectSchema(feedPlugins);
export type InsertFeedPlugin = z.infer<typeof insertFeedPluginSchema>;
export type UpdateFeedPlugin = z.infer<typeof updateFeedPluginSchema>;
export type SelectFeedPlugin = z.infer<typeof selectFeedPluginSchema>;

// Submission Schemas and Types
export const insertSubmissionSchema = createInsertSchema(submissions);
export const updateSubmissionSchema = createUpdateSchema(submissions);
export const selectSubmissionSchema = createSelectSchema(submissions, {
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type UpdateSubmission = z.infer<typeof updateSubmissionSchema>;
export type SelectSubmission = z.infer<typeof selectSubmissionSchema>;

// SubmissionFeed Schemas and Types
export const insertSubmissionFeedSchema = createInsertSchema(submissionFeeds);
export const updateSubmissionFeedSchema = createUpdateSchema(submissionFeeds);
export const selectSubmissionFeedSchema = createSelectSchema(submissionFeeds);
export type InsertSubmissionFeed = z.infer<typeof insertSubmissionFeedSchema>;
export type UpdateSubmissionFeed = z.infer<typeof updateSubmissionFeedSchema>;
export type SelectSubmissionFeed = z.infer<typeof selectSubmissionFeedSchema>;

// ModerationHistory Schemas and Types
export const insertModerationHistorySchema =
  createInsertSchema(moderationHistory);
export const updateModerationHistorySchema =
  createUpdateSchema(moderationHistory); // Likely append-only
export const selectModerationHistorySchema =
  createSelectSchema(moderationHistory, {
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  });
export type InsertModerationHistory = z.infer<
  typeof insertModerationHistorySchema
>;
export type UpdateModerationHistory = z.infer<
  typeof updateModerationHistorySchema
>;
export type SelectModerationHistory = z.infer<
  typeof selectModerationHistorySchema
>;

// SubmissionCounts Schemas and Types
export const insertSubmissionCountSchema = createInsertSchema(submissionCounts);
export const updateSubmissionCountSchema = createUpdateSchema(submissionCounts);
export const selectSubmissionCountSchema = createSelectSchema(submissionCounts);
export type InsertSubmissionCount = z.infer<typeof insertSubmissionCountSchema>;
export type UpdateSubmissionCount = z.infer<typeof updateSubmissionCountSchema>;
export type SelectSubmissionCount = z.infer<typeof selectSubmissionCountSchema>;

// LastProcessedState Schemas and Types
export const insertLastProcessedStateSchema = createInsertSchema(
  lastProcessedStateTable,
);
export const updateLastProcessedStateSchema = createUpdateSchema(
  lastProcessedStateTable,
);
export const selectLastProcessedStateSchema = createSelectSchema(
  lastProcessedStateTable,
);
export type InsertLastProcessedState = z.infer<
  typeof insertLastProcessedStateSchema
>;
export type UpdateLastProcessedState = z.infer<
  typeof updateLastProcessedStateSchema
>;
export type SelectLastProcessedState = z.infer<
  typeof selectLastProcessedStateSchema
>;
