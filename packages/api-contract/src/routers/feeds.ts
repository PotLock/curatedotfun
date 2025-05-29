import {
  insertFeedSchema,
  selectFeedSchema,
  selectSubmissionSchema,
  updateFeedSchema,
} from "@curatedotfun/shared-db";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

// --- Schemas ---

const FeedIdInputSchema = z.object({
  feedId: z.string(),
});

const GetSubmissionsInputSchema = FeedIdInputSchema;

const ProcessFeedInputSchema = z.object({
  feedId: z.string(),
  distributors: z.string().optional(),
});

const ProcessFeedOutputSchema = z.object({
  processed: z.number(),
  distributors: z.any()
  // errors: z.array(
  //   z.object({ submissionId: z.string().optional(), error: z.string() }),
  // ),
});

// --- Procedure Definitions ---

export const getAllFeedsDefinition = {
  meta: {
    openapi: { method: "GET", path: "/feeds", tags: ["feeds"] } as const,
  },
  output: z.array(selectFeedSchema),
};

export const createFeedDefinition = {
  meta: {
    openapi: { method: "POST", path: "/feeds", tags: ["feeds"] } as const,
  },
  input: insertFeedSchema,
  output: selectFeedSchema,
};

export const getFeedByIdDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/feeds/{feedId}",
      tags: ["feeds"],
    } as const,
  },
  input: FeedIdInputSchema,
  output: selectFeedSchema.nullable(),
};

export const getSubmissionsByFeedDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/feeds/{feedId}/submissions",
      tags: ["feeds", "submissions"],
    } as const,
  },
  input: GetSubmissionsInputSchema,
  output: z.array(selectSubmissionSchema).nullable(),
};

export const updateFeedDefinition = {
  meta: {
    openapi: {
      method: "PUT",
      path: "/feeds/{feedId}",
      tags: ["feeds"],
    } as const,
  },
  input: updateFeedSchema.extend({ feedId: z.string() }),
  output: selectFeedSchema.nullable(),
};

export const processFeedDefinition = {
  meta: {
    openapi: {
      method: "POST",
      path: "/feeds/{feedId}/process",
      tags: ["feeds"],
    } as const,
  },
  input: ProcessFeedInputSchema,
  output: ProcessFeedOutputSchema,
};

// --- Contract Router ---

const getAllFeedsContract = publicProcedure
  .meta({
    openapi: {
      ...getAllFeedsDefinition.meta.openapi,
      tags: [...getAllFeedsDefinition.meta.openapi.tags],
    },
  })
  .output(getAllFeedsDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const createFeedContract = protectedProcedure
  .meta({
    openapi: {
      ...createFeedDefinition.meta.openapi,
      tags: [...createFeedDefinition.meta.openapi.tags],
    },
  })
  .input(createFeedDefinition.input)
  .output(createFeedDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

const getFeedByIdContract = publicProcedure
  .meta({
    openapi: {
      ...getFeedByIdDefinition.meta.openapi,
      tags: [...getFeedByIdDefinition.meta.openapi.tags],
    },
  })
  .input(getFeedByIdDefinition.input)
  .output(getFeedByIdDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const getSubmissionsByFeedContract = publicProcedure
  .meta({
    openapi: {
      ...getSubmissionsByFeedDefinition.meta.openapi,
      tags: [...getSubmissionsByFeedDefinition.meta.openapi.tags],
    },
  })
  .input(getSubmissionsByFeedDefinition.input)
  .output(getSubmissionsByFeedDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const updateFeedContract = protectedProcedure
  .meta({
    openapi: {
      ...updateFeedDefinition.meta.openapi,
      tags: [...updateFeedDefinition.meta.openapi.tags],
    },
  })
  .input(updateFeedDefinition.input)
  .output(updateFeedDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

const processFeedContract = protectedProcedure
  .meta({
    openapi: {
      ...processFeedDefinition.meta.openapi,
      tags: [...processFeedDefinition.meta.openapi.tags],
    },
  })
  .input(processFeedDefinition.input)
  .output(processFeedDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

export const feedsContractRouter = router({
  getAllFeeds: getAllFeedsContract,
  createFeed: createFeedContract,
  getFeedById: getFeedByIdContract,
  getSubmissionsByFeed: getSubmissionsByFeedContract,
  updateFeed: updateFeedContract,
  processFeed: processFeedContract,
});

export type FeedsContractRouter = typeof feedsContractRouter;
