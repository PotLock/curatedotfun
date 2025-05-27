import { z } from "zod";
import {
  type FeedsContractRouter,
  getAllFeedsDefinition,
  createFeedDefinition,
  getFeedByIdDefinition,
  getSubmissionsByFeedDefinition,
  updateFeedDefinition,
  processFeedDefinition,
} from "@curatedotfun/api-contract";
import {
  selectFeedSchema,
  insertFeedSchema,
  updateFeedSchema,
} from "@curatedotfun/types";
import { selectSubmissionSchema } from "@curatedotfun/shared-db";
import {
  protectedProcedure,
  publicProcedure,
  router,
  handleServiceError,
} from "../trpc";
import { TRPCError } from "@trpc/server";

// Schemas for inputs that are not directly part of the main entity schemas
const FeedIdInputSchema = z.object({
  feedId: z.string(),
});

const ProcessFeedInputSchema = z.object({
  feedId: z.string(),
  distributors: z.string().optional(),
});

// Output schema for processFeed, as defined in contract
const ProcessFeedOutputSchema = z.object({
  processed: z.number(),
  distributed: z.number(),
  errors: z.array(
    z.object({ submissionId: z.string().optional(), error: z.string() }),
  ),
});

// --- Procedures ---

// GET /feeds
const getAllFeedsProcedure = publicProcedure
  .meta({
    openapi: {
      ...getAllFeedsDefinition.meta.openapi,
      tags: [...getAllFeedsDefinition.meta.openapi.tags],
    },
  })
  .output(z.array(selectFeedSchema))
  .query(async ({ ctx }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      const feeds = await feedService.getAllFeeds();
      return feeds;
    } catch (error) {
      // logger.error("Error fetching all feeds:", error); // Logger not directly available
      return handleServiceError(error);
    }
  });

// POST /feeds
const createFeedProcedure = protectedProcedure
  .meta({
    openapi: {
      ...createFeedDefinition.meta.openapi,
      tags: [...createFeedDefinition.meta.openapi.tags],
    },
  })
  .input(insertFeedSchema)
  .output(selectFeedSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      const newFeed = await feedService.createFeed(input);
      return newFeed;
    } catch (error) {
      // logger.error("Error creating feed:", error);
      return handleServiceError(error);
    }
  });

// GET /feeds/:feedId
const getFeedByIdProcedure = publicProcedure
  .meta({
    openapi: {
      ...getFeedByIdDefinition.meta.openapi,
      tags: [...getFeedByIdDefinition.meta.openapi.tags],
    },
  })
  .input(FeedIdInputSchema) // Using locally defined schema for input
  .output(selectFeedSchema.nullable())
  .query(async ({ ctx, input }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      const feed = await feedService.getFeedById(input.feedId);
      if (!feed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feed not found" });
      }
      return feed;
    } catch (error) {
      // logger.error(`Error fetching feed ${input.feedId}:`, error);
      return handleServiceError(error);
    }
  });

// GET /feeds/:feedId/submissions
const getSubmissionsByFeedProcedure = publicProcedure
  .meta({
    openapi: {
      ...getSubmissionsByFeedDefinition.meta.openapi,
      tags: [...getSubmissionsByFeedDefinition.meta.openapi.tags],
    },
  })
  .input(FeedIdInputSchema) // Using locally defined schema for input
  .output(z.array(selectSubmissionSchema).nullable())
  .query(async ({ ctx, input }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      const submissions = await feedService.getSubmissionsByFeed(input.feedId);
      if (submissions === null) {
        // Consistent with contract, service returns null if feed not found or no submissions
        // Or throw TRPCError if feed itself not found
        const feed = await feedService.getFeedById(input.feedId); // Check if feed exists
        if (!feed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Feed with ID ${input.feedId} not found.`,
          });
        }
        return null; // Feed exists, but no submissions or service returned null
      }
      return submissions;
    } catch (error) {
      // logger.error(`Error fetching submissions for feed ${input.feedId}:`, error);
      return handleServiceError(error);
    }
  });

// PUT /feeds/:feedId
const updateFeedProcedure = protectedProcedure
  .meta({
    openapi: {
      ...updateFeedDefinition.meta.openapi,
      tags: [...updateFeedDefinition.meta.openapi.tags],
    },
  })
  .input(updateFeedSchema.extend({ feedId: z.string() })) // Input from contract includes feedId
  .output(selectFeedSchema.nullable())
  .mutation(async ({ ctx, input }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      const { feedId, ...updateData } = input;
      const updatedFeed = await feedService.updateFeed(feedId, updateData);
      if (!updatedFeed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feed not found for update",
        });
      }
      return updatedFeed;
    } catch (error) {
      // logger.error(`Error updating feed ${input.feedId}:`, error);
      return handleServiceError(error);
    }
  });

// POST /feeds/:feedId/process
const processFeedProcedure = protectedProcedure
  .meta({
    openapi: {
      ...processFeedDefinition.meta.openapi,
      tags: [...processFeedDefinition.meta.openapi.tags],
    },
  })
  .input(ProcessFeedInputSchema) // Using locally defined schema for input
  .output(ProcessFeedOutputSchema) // Using locally defined schema for output
  .mutation(async ({ ctx, input }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      const result = await feedService.processFeed(
        input.feedId,
        input.distributors,
      );
      return result;
    } catch (error: any) {
      // logger.error(`Error processing feed ${input.feedId}:`, error);
      // Specific error handling from Hono route:
      if (
        error.message &&
        (error.message.startsWith("Feed not found") ||
          error.message.startsWith("Feed configuration not found"))
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: error.message });
      }
      return handleServiceError(error);
    }
  });

// --- Router ---
export const feedsRouter: FeedsContractRouter = router({
  getAllFeeds: getAllFeedsProcedure,
  createFeed: createFeedProcedure,
  getFeedById: getFeedByIdProcedure,
  getSubmissionsByFeed: getSubmissionsByFeedProcedure,
  updateFeed: updateFeedProcedure,
  processFeed: processFeedProcedure,
});

// for catching type errors
const _assertFeedsRouterConforms: FeedsContractRouter = feedsRouter;
