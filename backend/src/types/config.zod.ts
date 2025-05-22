import { z } from "zod";
import { SubmissionStatus } from "./submission";

// Schema for GlobalConfig
export const GlobalConfigSchema = z.object({
  botId: z.string(),
  defaultStatus: z.nativeEnum(SubmissionStatus),
  maxDailySubmissionsPerUser: z.number().int().positive(),
  blacklist: z.record(z.array(z.string())), // e.g. { "twitter": ["user1", "user2"] }
});

// Schema for basic plugin registration (used in top-level plugins config)
export const PluginRegistrationConfigSchema = z.object({
  type: z.enum(["transformer", "distributor", "source"]),
  url: z.string().url(),
  config: z.record(z.unknown()).optional(), // Static config for the plugin instance
});
export type PluginRegistrationConfig = z.infer<
  typeof PluginRegistrationConfigSchema
>;

// Schema for ModerationConfig
export const ModerationConfigSchema = z.object({
  approvers: z.record(z.string(), z.array(z.string())).optional(),
  // Key is the platform identifier,
  // value is an array of approver usernames or IDs for that platform.

  // TODO: usernames can change, and so we should root in userIds per platform (on feed creation)
});
export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;

// Schema for TransformConfig (used in StreamConfig, DistributorConfig, RecapConfig)
export const TransformConfigSchema = z.object({
  plugin: z.string(), // Name/key of the transformer plugin registered in AppConfig.plugins
  config: z.record(z.unknown()), // Config specific to this transformation step
});
export type TransformConfig = z.infer<typeof TransformConfigSchema>;

// Schema for DistributorConfig (used in StreamConfig, RecapConfig)
export const DistributorConfigSchema = z.object({
  plugin: z.string(), // Name/key of the distributor plugin registered in AppConfig.plugins
  config: z.record(z.string()), // Config specific to this distributor instance
  transform: z.array(TransformConfigSchema).optional(), // Per-distributor transforms
});
export type DistributorConfig = z.infer<typeof DistributorConfigSchema>;

// Schema for StreamConfig (part of FeedConfig.outputs)
export const StreamConfigSchema = z.object({
  enabled: z.boolean(),
  transform: z.array(TransformConfigSchema).optional(), // Global transforms for the stream
  distribute: z.array(DistributorConfigSchema).optional(),
});

// Schema for RecapConfig (using structure from recap.ts)
export const RecapConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  schedule: z.string(), // Cron expression or interval
  timezone: z.string().optional(),
  transform: z.array(TransformConfigSchema).optional(),
  batchTransform: z.array(TransformConfigSchema).optional(),
  distribute: z.array(DistributorConfigSchema).optional(),
});
export type RecapConfig = z.infer<typeof RecapConfigSchema>;

// Schema for individual search configuration within a source
export const SourceSearchConfigSchema = z
  .object({
    searchId: z.string(), // Unique ID for this search block to manage its state
    type: z.string(), // Type of search within the plugin (e.g., "twitter-scraper", "reddit-posts")
    query: z.string().optional(), // General query string
    pageSize: z.number().int().positive().optional(),
    language: z.string().optional(), // e.g., "en", "es"
    platformArgs: z.record(z.unknown()).optional(), // Platform-specific arguments
    // Allow other dynamic properties
  })
  .catchall(z.unknown());
export type SourceSearchConfig = z.infer<typeof SourceSearchConfigSchema>;

// Schema for SourceConfig (part of FeedConfig)
export const SourceConfigSchema = z.object({
  plugin: z.string(), // Name/key of the source plugin registered in AppConfig.plugins
  // Config for the source plugin instance itself (e.g., API keys, base URLs)
  // This 'config' is passed to the plugin's initialize method.
  config: z.record(z.unknown()).optional(),
  // Array of search configurations for this source instance in this feed.
  // Each object defines a specific query/task for the source plugin.
  search: z.array(SourceSearchConfigSchema),
});
export type SourceConfig = z.infer<typeof SourceConfigSchema>;

// Schema for feed ingestion scheduling
export const IngestionConfigSchema = z.object({
  enabled: z.boolean().default(false).optional(),
  schedule: z.string().min(1),
});

// Schema for FeedConfig
export const FeedConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().optional().default(true),
  pollingIntervalMs: z.number().int().positive().optional(),
  moderation: ModerationConfigSchema,
  sources: z.array(SourceConfigSchema).optional(),
  ingestion: IngestionConfigSchema.optional(), // Configuration for source ingestion scheduling
  outputs: z.object({
    stream: StreamConfigSchema.optional(),
    recap: z.array(RecapConfigSchema).optional(),
  }),
});

// Schema for NEAR Integration Config
export const NearIntegrationConfigSchema = z.object({
  parentAccountId: z.string().min(1),
  parentKeyPair: z.string().min(1), // Sensitive value
  networkId: z.string().min(1),
  nodeUrl: z.string().url().optional(), // Optional, can be derived from networkId
  walletUrl: z.string().url().optional(), // Optional
  helperUrl: z.string().url().optional(), // Optional
  explorerUrl: z.string().url().optional(), // Optional
});
export type NearIntegrationConfig = z.infer<typeof NearIntegrationConfigSchema>;

// Schema for all Integrations
export const IntegrationsConfigSchema = z.object({
  near: NearIntegrationConfigSchema.optional(),
});
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;

// Schema for the entire AppConfig
export const AppConfigSchema = z.object({
  global: GlobalConfigSchema,
  plugins: z.record(PluginRegistrationConfigSchema), // Maps plugin name to its registration config
  feeds: z.array(FeedConfigSchema),
  integrations: IntegrationsConfigSchema.optional(),
});

// TODO: CONSOLIDATE ALL CONFIGS TO HERE

// Infer TypeScript types from Zod schemas
export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;
// PluginRegistrationConfig already exported
// ModerationConfig already exported via FeedConfig or directly if needed
// TransformConfig already exported
// DistributorConfig already exported
export type StreamConfig = z.infer<typeof StreamConfigSchema>;
// RecapConfig already exported
// SourceSearchConfig already exported
// SourceConfig already exported
export type IngestionConfig = z.infer<typeof IngestionConfigSchema>; // Ensure IngestionConfig type is exported
export type FeedConfig = z.infer<typeof FeedConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

// Example of how to get a specific plugin config type if needed, though usually generic is fine
export type TransformerPluginRegistrationConfig = z.infer<
  typeof PluginRegistrationConfigSchema
> & { type: "transformer" };
export type DistributorPluginRegistrationConfig = z.infer<
  typeof PluginRegistrationConfigSchema
> & { type: "distributor" };
export type SourcePluginRegistrationConfig = z.infer<
  typeof PluginRegistrationConfigSchema
> & { type: "source" };
