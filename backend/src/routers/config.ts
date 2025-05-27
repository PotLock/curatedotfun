import { z } from "zod";
import {
  type ConfigContractRouter,
  reloadConfigDefinition,
  getFullConfigDefinition,
  getAllFeedConfigsDefinition,
  getFeedConfigDefinition,
  // The following schemas are not exported from the contract, so we define them here
  // or assume they will be available globally/fixed later by the user.
  // For now, defining them to avoid immediate errors in this file.
} from "@curatedotfun/api-contract";
import type { AppConfig, FeedConfig } from "@curatedotfun/types"; // Assuming these types exist
import {
  protectedProcedure,
  publicProcedure,
  router,
  handleServiceError,
} from "../trpc";

// Schemas that were causing issues in the contract file, defined here for now.
// User will address type errors later.
const AppConfigSchema = z.custom<AppConfig>(); // Or z.any() if AppConfig is not available
const FeedConfigSchema = z.custom<FeedConfig>(); // Or z.any() if FeedConfig is not available

const ReloadConfigOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  config: AppConfigSchema,
});

const FullConfigSchema = AppConfigSchema;
const FeedArraySchema = z.array(FeedConfigSchema);

const GetFeedConfigInputSchema = z.object({
  feedId: z.string(),
});

// --- Procedures ---

// POST /config/reload
const reloadConfigProcedure = protectedProcedure
  .meta({
    openapi: {
      ...reloadConfigDefinition.meta.openapi,
      tags: [...reloadConfigDefinition.meta.openapi.tags],
    },
  })
  .output(ReloadConfigOutputSchema) // Use the locally defined schema
  .mutation(async ({ ctx }) => {
    try {
      const config = await ctx.sp.getConfigService().loadConfig();
      // Reinitialize the submission service to update admin IDs and feeds
      if (ctx.sp.getSubmissionService()) {
        await ctx.sp.getSubmissionService().initialize();
        // logger.info("Reinitialized submission service with updated configuration"); // Logger not available directly here
      }
      return {
        success: true,
        message: "Configuration reloaded successfully",
        config,
      };
    } catch (error: any) {
      // Return a structure that matches ReloadConfigOutputSchema for errors too,
      // or let handleServiceError throw a TRPCError which is preferred.
      // For now, to match original Hono, we send success:false.
      // handleServiceError might be better if it standardizes error shapes.
      // This specific error handling might need refinement based on how handleServiceError works.
      return {
        success: false,
        message: `Failed to reload configuration: ${error.message || error}`,
        config: null as any, // Or an empty/default config structure
      };
      // Or, more tRPC idiomatic:
      // return handleServiceError(error);
    }
  });

// GET /config
const getFullConfigProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getFullConfigDefinition.meta.openapi,
      tags: [...getFullConfigDefinition.meta.openapi.tags],
    },
  })
  .output(FullConfigSchema) // Use the locally defined schema
  .query(async ({ ctx }) => {
    try {
      const rawConfig = await ctx.sp.getConfigService().getRawConfig();
      return rawConfig;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /config/feeds
const getAllFeedConfigsProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getAllFeedConfigsDefinition.meta.openapi,
      tags: [...getAllFeedConfigsDefinition.meta.openapi.tags],
    },
  })
  .output(FeedArraySchema) // Use the locally defined schema
  .query(async ({ ctx }) => {
    try {
      const rawConfig = await ctx.sp.getConfigService().getRawConfig();
      return rawConfig.feeds;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /config/:feedId
const getFeedConfigProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getFeedConfigDefinition.meta.openapi,
      tags: [...getFeedConfigDefinition.meta.openapi.tags],
    },
  })
  .input(GetFeedConfigInputSchema) // Use the locally defined schema
  .output(FeedConfigSchema.nullable()) // Use the locally defined schema
  .query(async ({ ctx, input }) => {
    try {
      const feed = ctx.sp.getConfigService().getFeedConfig(input.feedId);
      // Original Hono used c.notFound(). TRPC will return null if not found based on schema.
      // If feed is undefined, it will become null due to .nullable()
      return feed || null;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// --- Router ---
export const configRouter: ConfigContractRouter = router({
  reloadConfig: reloadConfigProcedure,
  getFullConfig: getFullConfigProcedure,
  getAllFeedConfigs: getAllFeedConfigsProcedure,
  getFeedConfig: getFeedConfigProcedure,
});

// for catching type errors
const _assertConfigRouterConforms: ConfigContractRouter = configRouter;
