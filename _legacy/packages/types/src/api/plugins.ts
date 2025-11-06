import { z } from "zod";

export const PluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  repoUrl: z.string(),
  entryPoint: z.string(),
  type: z.enum(["transformer", "distributor", "source", "rule", "outcome"]),
  schemaDefinition: z.record(z.string(), z.any()).optional(),
});

export type Plugin = z.infer<typeof PluginSchema>;
