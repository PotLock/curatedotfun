import { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import * as schema from "./schema";
import type { SelectModerationHistory } from "./schema/moderation";

export type DB = NodePgDatabase<typeof schema>;

const {
  activities,
  userStats,
  feedUserStats,
  feeds,
  feedRecapsState,
  feedPlugins,
  submissions,
  submissionFeeds,
  submissionCounts,
} = schema;

// Feed Schemas and Types
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

// Submission Schemas and Types
export const insertSubmissionSchema = createInsertSchema(submissions, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateSubmissionSchema = createUpdateSchema(submissions);
export const selectSubmissionSchema = createSelectSchema(submissions, {
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type UpdateSubmission = z.infer<typeof updateSubmissionSchema>;
export type SelectSubmission = z.infer<typeof selectSubmissionSchema>;

export type RichSubmission = SelectSubmission & {
  feeds: SelectSubmissionFeed[];
  moderationHistory: SelectModerationHistory[];
};

// SubmissionFeed Schemas and Types
export const insertSubmissionFeedSchema = createInsertSchema(submissionFeeds, {
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});
export const updateSubmissionFeedSchema = createUpdateSchema(submissionFeeds);
export const selectSubmissionFeedSchema = createSelectSchema(submissionFeeds);
export type InsertSubmissionFeed = z.infer<typeof insertSubmissionFeedSchema>;
export type UpdateSubmissionFeed = z.infer<typeof updateSubmissionFeedSchema>;
export type SelectSubmissionFeed = z.infer<typeof selectSubmissionFeedSchema>;

// SubmissionCounts Schemas and Types
export const insertSubmissionCountSchema = createInsertSchema(
  submissionCounts,
  {
    createdAt: z.undefined(),
    updatedAt: z.undefined(),
  },
);
export const updateSubmissionCountSchema = createUpdateSchema(submissionCounts);
export const selectSubmissionCountSchema = createSelectSchema(submissionCounts);
export type InsertSubmissionCount = z.infer<typeof insertSubmissionCountSchema>;
export type UpdateSubmissionCount = z.infer<typeof updateSubmissionCountSchema>;
export type SelectSubmissionCount = z.infer<typeof selectSubmissionCountSchema>;
