import { z } from "zod";
import {
  TransformConfigSchema,
  DistributorConfigSchema,
  ModerationConfigSchema,
  StreamConfigSchema,
  RecapConfigSchema,
  FeedConfigSchema,
} from "../types/config.zod"; // Corrected import path

// Re-export the schemas if they are directly used by other validation files,
// or adjust other files to import directly from types/config.zod.ts.
// For now, let's re-export them under the same names they were defined with previously in this file.
export const transformConfigSchema = TransformConfigSchema;
export const distributorConfigSchema = DistributorConfigSchema;
export const moderationConfigSchema = ModerationConfigSchema;
export const streamConfigSchema = StreamConfigSchema;
export const recapConfigSchema = RecapConfigSchema;
export const feedConfigSchema = FeedConfigSchema;

// Type exports for convenience - these will now infer from the imported schemas
export type TransformConfigData = z.infer<typeof transformConfigSchema>;
export type DistributorConfigData = z.infer<typeof distributorConfigSchema>;
export type ModerationConfigData = z.infer<typeof moderationConfigSchema>;
export type StreamConfigData = z.infer<typeof streamConfigSchema>;
export type RecapConfigData = z.infer<typeof recapConfigSchema>;
export type FeedConfigData = z.infer<typeof feedConfigSchema>;
