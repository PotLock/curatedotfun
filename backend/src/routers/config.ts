import {
  type ConfigContractRouter,
  getAllFeedConfigsDefinition,
  getFeedConfigDefinition,
  getFullConfigDefinition
} from "@curatedotfun/api-contract";
import { AppConfigSchema, FeedConfigSchema } from "@curatedotfun/types";
import { z } from "zod";
import {
  handleServiceError,
  protectedProcedure,
  router
} from "../trpc";

const FeedArraySchema = z.array(FeedConfigSchema);

const GetFeedConfigInputSchema = z.object({
  feedId: z.string(),
});

// --- Procedures ---

// GET /config
const getFullConfigProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getFullConfigDefinition.meta.openapi,
      tags: [...getFullConfigDefinition.meta.openapi.tags],
    },
  })
  .output(AppConfigSchema)
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
  .output(FeedArraySchema)
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
  .input(GetFeedConfigInputSchema)
  .output(FeedConfigSchema.nullable())
  .query(async ({ ctx, input }) => {
    try {
      const feed = ctx.sp.getConfigService().getFeedConfig(input.feedId);
      return feed || null;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// --- Router ---
export const configRouter: ConfigContractRouter = router({
  getFullConfig: getFullConfigProcedure,
  getAllFeedConfigs: getAllFeedConfigsProcedure,
  getFeedConfig: getFeedConfigProcedure,
});

// for catching type errors
const _assertConfigRouterConforms: ConfigContractRouter = configRouter;
