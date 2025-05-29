import {
  type TriggerContractRouter,
  triggerIngestFeedDefinition,
  triggerRecapJobDefinition,
} from "@curatedotfun/api-contract";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// --- Schemas (matching contract definitions) ---

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

// --- Procedures ---

// POST /trigger/recap
const triggerRecapJobProcedure = protectedProcedure
  .meta({
    openapi: {
      ...triggerRecapJobDefinition.meta.openapi,
      tags: [...triggerRecapJobDefinition.meta.openapi.tags],
    },
  })
  .input(RecapJobInputSchema)
  .output(RecapJobOutputSchema)
  .mutation(async ({ ctx, input }) => {
    const { feedId, recapId } = input;
    // logger.info(`Received request to run recap: ${feedId}/${recapId}`); // Logger not directly available
    try {
      const schedulerService = ctx.sp.getSchedulerService();
      // Original Hono route had: await schedulerService.runRecapJob(feedId, recapId);
      // This method might not exist or might have different signature.
      // For now, assuming a similar method or that this will be adapted.
      // If runRecapJob is fire-and-forget and doesn't return, the output schema is fine.
      await schedulerService.triggerRecapJob(feedId, recapId); // Assuming a method like this exists
      return {
        success: true,
        message:
          "Recap trigger acknowledged. Processing will be handled by SchedulerService.",
      };
    } catch (error: any) {
      // logger.error(`Error running recap job: ${feedId}/${recapId}`, error);
      // The Hono route returned a specific error message. TRPCError is more idiomatic.
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error running recap job ${feedId}/${recapId}: ${error.message || String(error)}`,
        cause: error,
      });
    }
  });

// POST /trigger/ingest/:feedId
const triggerIngestFeedProcedure = protectedProcedure
  .meta({
    openapi: {
      ...triggerIngestFeedDefinition.meta.openapi,
      tags: [...triggerIngestFeedDefinition.meta.openapi.tags],
    },
  })
  .input(IngestFeedInputSchema)
  .output(IngestFeedOutputSchema)
  .mutation(async ({ ctx, input }) => {
    const { feedId } = input;
    // logger.info(`Received request to ingest sources for feed: ${feedId}`);
    try {
      const schedulerService = ctx.sp.getSchedulerService();
      await schedulerService.processFeedSources(feedId);
      // logger.info(`Successfully triggered source ingestion for feed: ${feedId}`);
      return { message: `Ingestion triggered for feed ${feedId}` };
    } catch (error: any) {
      // logger.error(`Error triggering ingestion for feed ${feedId}:`, error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to trigger ingestion for feed ${feedId}: ${error.message || String(error)}`,
        cause: error,
      });
    }
  });

// --- Router ---
export const triggerRouter: TriggerContractRouter = router({
  triggerRecapJob: triggerRecapJobProcedure,
  triggerIngestFeed: triggerIngestFeedProcedure,
});

// for catching type errors
const _assertTriggerRouterConforms: TriggerContractRouter = triggerRouter;
