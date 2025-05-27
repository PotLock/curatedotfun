import { z } from "zod";
import { publicProcedure, router } from "../trpc";

// --- Schemas ---

const PlatformStatsSchema = z.object({
  postsCount: z.number(),
  feedsCount: z.number(),
  curatorsCount: z.number(),
  distributionsCount: z.number(),
});

// --- Procedure Definitions ---

export const getPlatformStatsDefinition = {
  meta: {
    openapi: { method: "GET", path: "/stats", tags: ["stats"] } as const,
  },
  output: PlatformStatsSchema,
};

// --- Contract Router ---

const getPlatformStatsContract = publicProcedure // Stats are likely public
  .meta({
    openapi: {
      ...getPlatformStatsDefinition.meta.openapi,
      tags: [...getPlatformStatsDefinition.meta.openapi.tags],
    },
  })
  .output(getPlatformStatsDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

export const statsContractRouter = router({
  getPlatformStats: getPlatformStatsContract,
});

export type StatsContractRouter = typeof statsContractRouter;
