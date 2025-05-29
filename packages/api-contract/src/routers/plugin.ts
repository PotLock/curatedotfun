import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// --- Schemas ---

const ReloadPluginsOutputSchema = z.object({
  success: z.boolean(),
});

// --- Procedure Definitions ---

export const reloadPluginsDefinition = {
  meta: {
    openapi: {
      method: "POST",
      path: "/plugins/reload",
      tags: ["plugins"],
    } as const,
  },
  output: ReloadPluginsOutputSchema,
};

// --- Contract Router ---

const reloadPluginsContract = protectedProcedure // Reloading plugins should be protected
  .meta({
    openapi: {
      ...reloadPluginsDefinition.meta.openapi,
      tags: [...reloadPluginsDefinition.meta.openapi.tags],
    },
  })
  .output(reloadPluginsDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

export const pluginContractRouter = router({
  reloadPlugins: reloadPluginsContract,
});

export type PluginContractRouter = typeof pluginContractRouter;
