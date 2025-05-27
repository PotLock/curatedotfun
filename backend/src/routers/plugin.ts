import { z } from "zod";
import {
  type PluginContractRouter,
  reloadPluginsDefinition,
} from "@curatedotfun/api-contract";
import { protectedProcedure, router, handleServiceError } from "../trpc";
// PluginService is usually a singleton, accessed via ctx.sp or directly if static getInstance is used.
// The original Hono route used: import { PluginService } from "../../services/plugin.service";
// And then: const pluginService = PluginService.getInstance();
// Assuming PluginService is available on the service provider (ctx.sp)

// --- Schemas ---
// Output schema is defined in the contract, re-affirming here for clarity if needed by procedure.
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
      // Accessing PluginService via service provider, if it's registered there.
      // If PluginService.getInstance() is the intended way, that needs to be callable.
      // For consistency with other services, using ctx.sp.getPluginService() is preferred.
      // If it's not on sp, this will need adjustment.
      const pluginService = ctx.sp.getPluginService(); // Assumes getPluginService exists on SP
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
