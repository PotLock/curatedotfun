import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as schema from "../services/db/schema";
import { feedConfigSchema } from "./config.validation";

export const insertFeedSchema = createInsertSchema(schema.feeds, {
  // id is the primary key (text) and should be provided by the user (e.g., hashtag)
  id: z.string().min(1, "Feed ID (hashtag) cannot be empty"),
  name: z.string().min(1, "Feed name cannot be empty"),
  description: z.string().optional(),
  config: feedConfigSchema,
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const selectFeedSchema = createSelectSchema(schema.feeds);

export const updateFeedSchema = createUpdateSchema(schema.feeds, {
  // id should not be updatable (TODO: migrate away from hashtag being id)
  id: z.undefined(),
  name: z.string().min(1, "Feed name cannot be empty").optional(),
  description: z.string().optional(),
  config: feedConfigSchema.optional(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export type InsertFeedData = z.infer<typeof insertFeedSchema>;
export type SelectFeedData = z.infer<typeof selectFeedSchema>;
export type UpdateFeedData = z.infer<typeof updateFeedSchema>;
