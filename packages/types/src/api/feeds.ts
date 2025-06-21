import { z } from "zod";
import { FeedConfig, FeedConfigSchema } from "../config";
import { ApiSuccessResponseSchema } from "./common";

/**
 * The request body sent to the API to create a new feed.
 * It's based on the main FeedConfig, as the client sends the entire configuration object.
 */
export const CreateFeedRequestSchema = FeedConfigSchema;
export type CreateFeedRequest = z.infer<typeof CreateFeedRequestSchema>;

export type CreateFeedConfig = Partial<FeedConfig>;

/**
 * The request body sent to the API to update an existing feed.
 * It allows for partial updates of the feed's configuration.
 */
export const UpdateFeedRequestSchema = FeedConfigSchema.partial();
export type UpdateFeedRequest = z.infer<typeof UpdateFeedRequestSchema>;

/**
 * The standard API response for a single feed, combining the core feed data
 * with its configuration.
 */
export const FeedResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_by: z.string().nullable(),
  admins: z.array(z.string()).nullable(),
  config: FeedConfigSchema,
  createdAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  updatedAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
});
export type FeedResponse = z.infer<typeof FeedResponseSchema>;

/**
 * The standard API response for a list of feeds.
 */
export const FeedsResponseSchema = z.array(FeedResponseSchema);
export type FeedsResponse = z.infer<typeof FeedsResponseSchema>;

/**
 * Wrapped successful response for a single feed.
 */
export const FeedWrappedResponseSchema =
  ApiSuccessResponseSchema(FeedResponseSchema);
export type FeedWrappedResponse = z.infer<typeof FeedWrappedResponseSchema>;

/**
 * Wrapped successful response for a list of feeds.
 */
export const FeedsWrappedResponseSchema =
  ApiSuccessResponseSchema(FeedsResponseSchema);
export type FeedsWrappedResponse = z.infer<typeof FeedsWrappedResponseSchema>;

export const CanModerateResponseSchema = z.object({
  canModerate: z.boolean(),
  reason: z.string().optional(),
  error: z.string().optional(),
});

export type CanModerateResponse = z.infer<typeof CanModerateResponseSchema>;
