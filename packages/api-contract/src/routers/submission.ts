import {
  selectSubmissionSchema,
  submissionStatusZodEnum,
} from "@curatedotfun/shared-db";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";

// --- Schemas ---

const PaginationSchema = z.object({
  page: z.number().int().min(0),
  limit: z.number().int().min(1),
  totalCount: z.number().int(),
  totalPages: z.number().int(),
  hasNextPage: z.boolean(),
});

const GetAllSubmissionsInputSchema = z.object({
  page: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
  status: submissionStatusZodEnum.optional(),
});

const GetAllSubmissionsOutputSchema = z.object({
  items: z.array(selectSubmissionSchema),
  pagination: PaginationSchema,
});

const GetSubmissionByIdInputSchema = z.object({
  submissionId: z.string(),
});

const GetSubmissionsByFeedInputSchema = z.object({
  feedId: z.string(),
  status: submissionStatusZodEnum.optional(),
});

// --- Procedure Definitions ---

export const getAllSubmissionsDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/submissions",
      tags: ["submissions"],
    } as const,
  },
  input: GetAllSubmissionsInputSchema,
  output: GetAllSubmissionsOutputSchema,
};

export const getSubmissionByIdDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/submissions/single/{submissionId}",
      tags: ["submissions"],
    } as const,
  },
  input: GetSubmissionByIdInputSchema,
  output: selectSubmissionSchema.nullable(),
};

export const getSubmissionsByFeedDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/submissions/feed/{feedId}",
      tags: ["submissions", "feeds"],
    } as const,
  },
  input: GetSubmissionsByFeedInputSchema,
  output: z.array(selectSubmissionSchema).nullable(),
};

// --- Contract Router ---

const getAllSubmissionsContract = publicProcedure
  .meta({
    openapi: {
      ...getAllSubmissionsDefinition.meta.openapi,
      tags: [...getAllSubmissionsDefinition.meta.openapi.tags],
    },
  })
  .input(getAllSubmissionsDefinition.input)
  .output(getAllSubmissionsDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const getSubmissionByIdContract = publicProcedure
  .meta({
    openapi: {
      ...getSubmissionByIdDefinition.meta.openapi,
      tags: [...getSubmissionByIdDefinition.meta.openapi.tags],
    },
  })
  .input(getSubmissionByIdDefinition.input)
  .output(getSubmissionByIdDefinition.output)
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

export const submissionContractRouter = router({
  getAllSubmissions: getAllSubmissionsContract,
  getSubmissionById: getSubmissionByIdContract,
  getSubmissionsByFeed: getSubmissionsByFeedContract,
});

export type SubmissionContractRouter = typeof submissionContractRouter;
