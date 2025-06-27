import { z } from "zod";
import {
  SourceConfigSchema,
  TransformConfigSchema,
  DistributorConfigSchema,
  RecapConfigSchema,
} from "@curatedotfun/types";

export const FeedConfigFormSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  description: z.string().min(1, "Description is required"),
  enabled: z.boolean(),
  pollingIntervalMs: z.number().min(1000).optional(),
  ingestionEnabled: z.boolean().optional(),
  ingestionSchedule: z.string().optional(),
  sources: z.array(SourceConfigSchema).optional(),
  // Outputs - flattened for easier form handling
  streamEnabled: z.boolean().optional(),
  streamTransforms: z.array(TransformConfigSchema).optional(),
  streamDistributors: z.array(DistributorConfigSchema).optional(),
  recaps: z.array(RecapConfigSchema).optional(),
  // Moderation - flattened for easier form handling
  moderationApprovers: z.record(z.array(z.string())).optional(),
  moderationBlacklist: z.record(z.array(z.string())).optional(),
});

export type FormValues = z.infer<typeof FeedConfigFormSchema>;
