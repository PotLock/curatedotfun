import { z } from "zod";

// Schema for ModerationConfig
export const ModerationConfigSchema = z.object({
  approvers: z.record(z.string(), z.array(z.string())).optional(),
  // Key is the platform identifier,
  // value is an array of approver usernames or IDs for that platform.
  blacklist: z.record(z.string(), z.array(z.string())).optional(), // e.g. { "twitter": ["user1", "user2"], "all": ["global_spammer"] }

  // TODO: usernames can change, and so we should root in userIds per platform (on feed creation)
});

// Schema for TransformConfig (used in StreamConfig, DistributorConfig, RecapConfig)
export const TransformConfigSchema = z.object({
  plugin: z.string(), // Name/key of the transformer plugin registered in AppConfig.plugins
  config: z.record(z.string(), z.any()),
});

// Schema for DistributorConfig (used in StreamConfig, RecapConfig)
export const DistributorConfigSchema = z.object({
  plugin: z.string(), // Name/key of the distributor plugin registered in AppConfig.plugins
  config: z.record(z.string(), z.any()), // Config specific to this distributor instance
  transform: z.array(TransformConfigSchema).optional(), // Per-distributor transforms
});

// Schema for StreamConfig (part of FeedConfig.outputs)
export const StreamConfigSchema = z.object({
  enabled: z.boolean(),
  transform: z.array(TransformConfigSchema).optional(), // Global transforms for the stream
  distribute: z.array(DistributorConfigSchema).optional(),
});

// Schema for RecapConfig (using structure from recap.ts)
export const RecapConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  enabled: z.boolean(),
  schedule: z.string().optional(),
  timezone: z.string().optional(),
  transform: z.array(TransformConfigSchema).optional(),
  batchTransform: z.array(TransformConfigSchema).optional(),
  distribute: z.array(DistributorConfigSchema).optional(),
});

// Schema for individual search configuration within a source
export const SourceSearchConfigSchema = z
  .object({
    searchId: z.string(), // Unique ID for this search block to manage its state
    type: z.string(), // Type of search within the plugin (e.g., "twitter-scraper", "reddit-posts")
    query: z.string().optional(), // General query string
    pageSize: z.number().int().positive().optional(),
    language: z.string().optional(), // e.g., "en", "es"
    platformArgs: z.record(z.string(), z.any()).optional(),
    // Allow other dynamic properties
  })
  .catchall(z.any());

// Schema for SourceConfig (part of FeedConfig)
export const SourceConfigSchema = z.object({
  plugin: z.string(), // Name/key of the source plugin registered in AppConfig.plugins
  // Config for the source plugin instance itself (e.g., API keys, base URLs)
  // This 'config' is passed to the plugin's initialize method.
  config: z.record(z.string(), z.any()).optional(),
  // Array of search configurations for this source instance in this feed.
  // Each object defines a specific query/task for the source plugin.
  search: z.array(SourceSearchConfigSchema),
});

// Schema for feed ingestion scheduling
export const IngestionConfigSchema = z.object({
  enabled: z.boolean().default(false).optional(),
  schedule: z.string().min(1),
});

export const FeedConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string().url().or(z.literal("")).optional(),
  enabled: z.boolean().optional().default(true),
  admins: z.array(z.string()).optional(),
  pollingIntervalMs: z.number().int().positive().optional(),
  moderation: ModerationConfigSchema,
  sources: z.array(SourceConfigSchema).optional(),
  ingestion: IngestionConfigSchema.optional(), // Configuration for source ingestion scheduling
  outputs: z.object({
    stream: StreamConfigSchema.optional(),
    recap: z.array(RecapConfigSchema).optional(),
  }),
});

export type StreamConfig = z.infer<typeof StreamConfigSchema>;
export type IngestionConfig = z.infer<typeof IngestionConfigSchema>;
export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;
export type TransformConfig = z.infer<typeof TransformConfigSchema>;
export type DistributorConfig = z.infer<typeof DistributorConfigSchema>;
export type RecapConfig = z.infer<typeof RecapConfigSchema>;
export type SourceSearchConfig = z.infer<typeof SourceSearchConfigSchema>;
export type SourceConfig = z.infer<typeof SourceConfigSchema>;
export type FeedConfig = z.infer<typeof FeedConfigSchema>;

// Schema for basic plugin registration (used in top-level plugins config)
export const PluginRegistrationConfigSchema = z.object({
  type: z.enum(["transformer", "distributor", "source"]),
  url: z.string().url(),
  config: z.record(z.unknown()).optional(), // Static config for the plugin instance
});
export type PluginRegistrationConfig = z.infer<
  typeof PluginRegistrationConfigSchema
>;

// Schema for NEAR Integration Config
export const NearIntegrationConfigSchema = z.object({
  parentAccountId: z.string().min(1),
  parentKeyPair: z.string().min(1), // Sensitive value
  networkId: z.string().min(1),
  rpcUrl: z.string().url().optional(), // Optional, can be derived from networkId
});
export type NearIntegrationConfig = z.infer<typeof NearIntegrationConfigSchema>;

// Schema for all Integrations
export const IntegrationsConfigSchema = z.object({
  near: NearIntegrationConfigSchema.optional(),
});
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;

// Schema for the entire AppConfig
export const AppConfigSchema = z.object({
  plugins: z.record(PluginRegistrationConfigSchema), // Maps plugin name to its registration config
  feeds: z.array(FeedConfigSchema),
  integrations: IntegrationsConfigSchema.optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type PluginsConfig = Record<string, PluginRegistrationConfig>; // Added export

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
