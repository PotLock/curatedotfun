import { z } from "zod";
import {
  type StatsContractRouter,
  getPlatformStatsDefinition,
} from "@curatedotfun/api-contract";
import { publicProcedure, router, handleServiceError } from "../trpc";
// import { submissionRepository } from "services/db";
// import { ServiceProvider } from "../../utils/service-provider";
// We'll assume these functionalities are available via ctx.sp or specific services.

// --- Schemas ---
// Output schema is defined in the contract
const PlatformStatsSchema = z.object({
  postsCount: z.number(),
  feedsCount: z.number(),
  curatorsCount: z.number(),
  distributionsCount: z.number(),
});

// --- Procedures ---

// GET /stats
const getPlatformStatsProcedure = publicProcedure
  .meta({
    openapi: {
      ...getPlatformStatsDefinition.meta.openapi,
      tags: [...getPlatformStatsDefinition.meta.openapi.tags],
    },
  })
  .output(PlatformStatsSchema)
  .query(async ({ ctx }) => {
    try {
      // Accessing services/repositories via ctx.sp
      // This part needs to align with how submissionRepository and FeedService are actually exposed.
      // Assuming a StatsService or direct repository access through sp.

      const submissionService = ctx.sp.getSubmissionService();
      const postsCount = await submissionService.getPostsCount();
      const curatorsCount = await submissionService.getCuratorsCount();

      const feedService = ctx.sp.getFeedService();
      const allFeeds = await feedService.getAllFeeds();
      const feedsCount = allFeeds.length;

      let distributionsCount = 0;
      allFeeds.forEach((feed: any) => {
        // Add type for feed if available from FeedService
        const { config } = feed;
        if (
          config?.outputs?.stream?.enabled &&
          config.outputs.stream.distribute
        ) {
          distributionsCount += config.outputs.stream.distribute.length;
        }
      });

      return {
        postsCount,
        feedsCount,
        curatorsCount,
        distributionsCount,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// --- Router ---
export const statsRouter: StatsContractRouter = router({
  getPlatformStats: getPlatformStatsProcedure,
});

// for catching type errors
const _assertStatsRouterConforms: StatsContractRouter = statsRouter;
