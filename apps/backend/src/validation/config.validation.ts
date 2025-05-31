import { z } from "zod";

// Schema for TransformConfig
export const transformConfigSchema = z.object({
  plugin: z.string(),
  config: z.record(z.string(), z.unknown()),
});

// Schema for DistributorConfig
export const distributorConfigSchema = z.object({
  plugin: z.string(),
  config: z.record(z.string(), z.string()),
  transform: z.array(transformConfigSchema).optional(),
});

// Schema for ModerationConfig
export const moderationConfigSchema = z.object({
  approvers: z.object({
    twitter: z.array(z.string()),
  }),
});

// Schema for StreamConfig
export const streamConfigSchema = z.object({
  enabled: z.boolean(),
  transform: z.array(transformConfigSchema).optional(),
  distribute: z.array(distributorConfigSchema).optional(),
});

// Schema for RecapConfig
export const recapConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  schedule: z.string(),
  timezone: z.string().optional(),
  transform: z.array(transformConfigSchema).optional(),
  batchTransform: z.array(transformConfigSchema).optional(),
  distribute: z.array(distributorConfigSchema).optional(),
});

// Schema for FeedConfig
export const feedConfigSchema = z.object({
  id: z.string().min(1, "Feed ID cannot be empty"), // Assuming id is the hashtag and should not be empty
  name: z.string().min(1, "Feed name cannot be empty"),
  description: z.string(), // Description can be empty
  moderation: moderationConfigSchema,
  outputs: z.object({
    stream: streamConfigSchema.optional(),
    recap: z.array(recapConfigSchema).optional(),
  }),
});

// Type exports for convenience
export type TransformConfigData = z.infer<typeof transformConfigSchema>;
export type DistributorConfigData = z.infer<typeof distributorConfigSchema>;
export type ModerationConfigData = z.infer<typeof moderationConfigSchema>;
export type StreamConfigData = z.infer<typeof streamConfigSchema>;
export type RecapConfigData = z.infer<typeof recapConfigSchema>;
export type FeedConfigData = z.infer<typeof feedConfigSchema>;
