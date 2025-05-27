import { FeedConfigSchema } from "@curatedotfun/types";
import { protectedProcedure, router } from "../trpc";

// --- Procedure Definitions ---

export const reloadConfigDefinition = {
  meta: {
    openapi: {
      method: "POST",
      path: "/config/reload",
      tags: ["config"],
    } as const,
  },
  output: ReloadConfigOutputSchema,
};

export const getFullConfigDefinition = {
  meta: {
    openapi: { method: "GET", path: "/config", tags: ["config"] } as const,
  },
  output: FullConfigSchema,
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

const reloadConfigContract = protectedProcedure
  .meta({
    openapi: {
      ...reloadConfigDefinition.meta.openapi,
      tags: [...reloadConfigDefinition.meta.openapi.tags],
    },
  })
  .output(reloadConfigDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

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
  reloadConfig: reloadConfigContract,
  getFullConfig: getFullConfigContract,
  getAllFeedConfigs: getAllFeedConfigsContract,
  getFeedConfig: getFeedConfigContract,
});

export type ConfigContractRouter = typeof configContractRouter;
