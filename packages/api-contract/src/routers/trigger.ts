import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// --- Schemas ---

const RecapJobInputSchema = z.object({
  feedId: z.string(),
  recapId: z.string(),
});

const RecapJobOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const IngestFeedInputSchema = z.object({
  feedId: z.string(),
});

const IngestFeedOutputSchema = z.object({
  message: z.string(),
});

// --- Procedure Definitions ---

export const triggerRecapJobDefinition = {
  meta: {
    openapi: {
      method: "POST",
      path: "/trigger/recap",
      tags: ["trigger", "scheduler"],
    } as const,
  },
  input: RecapJobInputSchema,
  output: RecapJobOutputSchema,
};

export const triggerIngestFeedDefinition = {
  meta: {
    openapi: {
      method: "POST",
      path: "/trigger/ingest/{feedId}",
      tags: ["trigger", "scheduler"],
    } as const,
  },
  input: IngestFeedInputSchema,
  output: IngestFeedOutputSchema,
};

// --- Contract Router ---

const triggerRecapJobContract = protectedProcedure
  .meta({
    openapi: {
      ...triggerRecapJobDefinition.meta.openapi,
      tags: [...triggerRecapJobDefinition.meta.openapi.tags],
    },
  })
  .input(triggerRecapJobDefinition.input)
  .output(triggerRecapJobDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

const triggerIngestFeedContract = protectedProcedure
  .meta({
    openapi: {
      ...triggerIngestFeedDefinition.meta.openapi,
      tags: [...triggerIngestFeedDefinition.meta.openapi.tags],
    },
  })
  .input(triggerIngestFeedDefinition.input)
  .output(triggerIngestFeedDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

export const triggerContractRouter = router({
  triggerRecapJob: triggerRecapJobContract,
  triggerIngestFeed: triggerIngestFeedContract,
});

export type TriggerContractRouter = typeof triggerContractRouter;
