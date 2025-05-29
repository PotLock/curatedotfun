import { z } from "zod";
import {
  type PluginContractRouter,
  reloadPluginsDefinition,
} from "@curatedotfun/api-contract";
import { protectedProcedure, router, handleServiceError } from "../trpc";

// add remove plugin from registry
// update plugin in registry

// --- Schemas ---
const ReloadPluginsOutputSchema = z.object({
  success: z.boolean(),
});

// --- Procedures ---

// POST /plugins/reload
const reloadPluginsProcedure = protectedProcedure
  .meta({
    openapi: {
      ...reloadPluginsDefinition.meta.openapi,
      tags: [...reloadPluginsDefinition.meta.openapi.tags],
    },
  })
  .output(ReloadPluginsOutputSchema)
  .mutation(async ({ ctx }) => {
    try {
      const pluginService = ctx.sp.getPluginService();
      await pluginService.reloadAllPlugins();
      return { success: true };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// --- Router ---
export const pluginRouter: PluginContractRouter = router({
  reloadPlugins: reloadPluginsProcedure,
});

// for catching type errors
const _assertPluginRouterConforms: PluginContractRouter = pluginRouter;
