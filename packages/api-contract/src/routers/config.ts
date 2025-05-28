import { AppConfigSchema } from "@curatedotfun/types";
import { protectedProcedure, router } from "../trpc";

// --- Procedure Definitions ---

export const getFullConfigDefinition = {
  meta: {
    openapi: { method: "GET", path: "/config", tags: ["config"] } as const,
  },
  output: AppConfigSchema,
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

export const configContractRouter = router({
  getFullConfig: getFullConfigContract
});

export type ConfigContractRouter = typeof configContractRouter;
