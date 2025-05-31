import { FeedConfigSchema } from "@curatedotfun/shared-db";
import { z } from "zod";

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
