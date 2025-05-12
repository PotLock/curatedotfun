import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import * as schema from '../services/db/schema';

// Generate Zod schemas and TypeScript types for each table
// Example for 'feeds' table:
export const insertFeedSchema = createInsertSchema(schema.feeds);
export const selectFeedSchema = createSelectSchema(schema.feeds);
export type InsertFeed = z.infer<typeof insertFeedSchema>;
export type SelectFeed = z.infer<typeof selectFeedSchema>;

// Example for 'submissions' table:
export const insertSubmissionSchema = createInsertSchema(schema.submissions);
export const selectSubmissionSchema = createSelectSchema(schema.submissions);
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type SelectSubmissionBase = z.infer<typeof selectSubmissionSchema>;

// Extended SelectSubmission type with feeds property
export interface SelectSubmission extends SelectSubmissionBase {
  feeds?: SelectSubmissionFeed[];
}

// Example for 'submissionFeeds' table:
export const insertSubmissionFeedSchema = createInsertSchema(schema.submissionFeeds);
export const selectSubmissionFeedSchema = createSelectSchema(schema.submissionFeeds);
export type InsertSubmissionFeed = z.infer<typeof insertSubmissionFeedSchema>;
export type SelectSubmissionFeed = z.infer<typeof selectSubmissionFeedSchema>;

// Example for 'feedRecapsState' table
export const insertFeedRecapStateSchema = createInsertSchema(schema.feedRecapsState);
export const selectFeedRecapStateSchema = createSelectSchema(schema.feedRecapsState);
export type InsertFeedRecapState = z.infer<typeof insertFeedRecapStateSchema>;
export type SelectFeedRecapState = z.infer<typeof selectFeedRecapStateSchema>;

// Example for 'moderationHistory' table
export const insertModerationHistorySchema = createInsertSchema(schema.moderationHistory);
export const selectModerationHistorySchema = createSelectSchema(schema.moderationHistory);
export type InsertModerationHistory = z.infer<typeof insertModerationHistorySchema>;
export type SelectModerationHistory = z.infer<typeof selectModerationHistorySchema>;

// Example for 'submissionCounts' table
export const insertSubmissionCountSchema = createInsertSchema(schema.submissionCounts);
export const selectSubmissionCountSchema = createSelectSchema(schema.submissionCounts);
export type InsertSubmissionCount = z.infer<typeof insertSubmissionCountSchema>;
export type SelectSubmissionCount = z.infer<typeof selectSubmissionCountSchema>;

// Example for 'feedPlugins' table
export const insertFeedPluginSchema = createInsertSchema(schema.feedPlugins);
export const selectFeedPluginSchema = createSelectSchema(schema.feedPlugins);
export type InsertFeedPlugin = z.infer<typeof insertFeedPluginSchema>;
export type SelectFeedPlugin = z.infer<typeof selectFeedPluginSchema>;

// Example for 'twitterCookies' table (if still needed)
export const insertTwitterCookieSchema = createInsertSchema(schema.twitterCookies);
export const selectTwitterCookieSchema = createSelectSchema(schema.twitterCookies);
export type InsertTwitterCookie = z.infer<typeof insertTwitterCookieSchema>;
export type SelectTwitterCookie = z.infer<typeof selectTwitterCookieSchema>;

// Example for 'twitterCache' table (if still needed)
export const insertTwitterCacheSchema = createInsertSchema(schema.twitterCache);
export const selectTwitterCacheSchema = createSelectSchema(schema.twitterCache);
export type InsertTwitterCache = z.infer<typeof insertTwitterCacheSchema>;
export type SelectTwitterCache = z.infer<typeof selectTwitterCacheSchema>;


// Re-export enums and other specific types from schema if needed
export const SubmissionStatus = schema.SubmissionStatus;
export type SubmissionStatus = schema.SubmissionStatus;


// Common Application Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(10),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;


// Add other shared types and interfaces here
// For example, AppContext, Service interfaces (once defined)

// Import the legacy AppContext type for reference
import { AppContext as LegacyAppContext } from '../types/app';

// Enhanced AppContext interface that extends the legacy one
// The full implementation is in appContext.ts
export interface AppContext extends LegacyAppContext {
  /**
   * Get a service from the container
   * @param token The service token to resolve
   * @returns The resolved service
   */
  getService<T>(token: string | symbol | (new (...args: any[]) => T)): T;
  
  /**
   * Check if a service is registered with the container
   * @param token The service token to check
   * @returns True if the service is registered
   */
  hasService(token: string | symbol | (new (...args: any[]) => any)): boolean;
}
