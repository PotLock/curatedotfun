import {
  type ConfigContractRouter,
  getFullConfigDefinition
} from "@curatedotfun/api-contract";
import { AppConfigSchema } from "@curatedotfun/types";
import { FeedConfigSchema } from "@curatedotfun/shared-db";
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

// --- Router ---
export const configRouter: ConfigContractRouter = router({
  getFullConfig: getFullConfigProcedure
});

// for catching type errors
const _assertConfigRouterConforms: ConfigContractRouter = configRouter;
