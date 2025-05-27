import { AppConfigSchema, FeedConfigSchema } from "@curatedotfun/types";
import { protectedProcedure, router } from "../trpc";

// --- Procedure Definitions ---

export const getFullConfigDefinition = {
  meta: {
    openapi: { method: "GET", path: "/config", tags: ["config"] } as const,
  },
  output: AppConfigSchema,
};

export const getAllFeedConfigsDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/config/feeds",
      tags: ["config"],
    } as const,
  },
  output: FeedArraySchema,
};

export const getFeedConfigDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/config/{feedId}",
      tags: ["config"],
    } as const,
  },
  input: GetFeedConfigInputSchema,
  output: FeedConfigSchema.nullable(),
};

// --- Contract Router ---

const getFullConfigContract = protectedProcedure
  .meta({
    openapi: {
      ...getFullConfigDefinition.meta.openapi,
      tags: [...getFullConfigDefinition.meta.openapi.tags],
    },
  })
  .output(getFullConfigDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const getAllFeedConfigsContract = protectedProcedure
  .meta({
    openapi: {
      ...getAllFeedConfigsDefinition.meta.openapi,
      tags: [...getAllFeedConfigsDefinition.meta.openapi.tags],
    },
  })
  .output(getAllFeedConfigsDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const getFeedConfigContract = protectedProcedure
  .meta({
    openapi: {
      ...getFeedConfigDefinition.meta.openapi,
      tags: [...getFeedConfigDefinition.meta.openapi.tags],
    },
  })
  .input(getFeedConfigDefinition.input)
  .output(getFeedConfigDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

export const configContractRouter = router({
  getFullConfig: getFullConfigContract,
  getAllFeedConfigs: getAllFeedConfigsContract,
  getFeedConfig: getFeedConfigContract,
});

export type ConfigContractRouter = typeof configContractRouter;
