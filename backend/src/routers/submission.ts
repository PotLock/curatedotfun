import { z } from "zod";
import {
  type SubmissionContractRouter,
  getAllSubmissionsDefinition,
  getSubmissionByIdDefinition,
  getSubmissionsByFeedDefinition,
} from "@curatedotfun/api-contract";
import {
  selectSubmissionSchema,
  submissionStatusZodEnum,
} from "@curatedotfun/shared-db";
import { publicProcedure, router, handleServiceError } from "../trpc";
import { TRPCError } from "@trpc/server";

// --- Schemas (matching contract definitions) ---

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

// --- Procedures ---

// GET /submissions
const getAllSubmissionsProcedure = publicProcedure
  .meta({
    openapi: {
      ...getAllSubmissionsDefinition.meta.openapi,
      tags: [...getAllSubmissionsDefinition.meta.openapi.tags],
    },
  })
  .input(GetAllSubmissionsInputSchema)
  .output(GetAllSubmissionsOutputSchema)
  .query(async ({ ctx, input }) => {
    try {
      const submissionService = ctx.sp.getSubmissionService();
      const { page, limit, status } = input;

      // The service method might need adjustment if it doesn't handle pagination internally.
      // Original Hono route fetched all, then sorted and paginated.
      let allSubmissions = await submissionService.getAllSubmissions(status);

      allSubmissions.sort(
        (a, b) =>
          new Date(b.submittedAt!).getTime() -
          new Date(a.submittedAt!).getTime(),
      );

      const totalCount = allSubmissions.length;
      const startIndex = page * limit;
      const endIndex = startIndex + limit;
      const paginatedSubmissions = allSubmissions.slice(startIndex, endIndex);

      return {
        items: paginatedSubmissions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: endIndex < totalCount,
        },
      };
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /submissions/single/:submissionId
const getSubmissionByIdProcedure = publicProcedure
  .meta({
    openapi: {
      ...getSubmissionByIdDefinition.meta.openapi,
      tags: [...getSubmissionByIdDefinition.meta.openapi.tags],
    },
  })
  .input(GetSubmissionByIdInputSchema)
  .output(selectSubmissionSchema.nullable())
  .query(async ({ ctx, input }) => {
    try {
      const submissionService = ctx.sp.getSubmissionService();
      const content = await submissionService.getSubmissionById(
        input.submissionId,
      );
      if (!content) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }
      return content;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// GET /submissions/feed/:feedId
const getSubmissionsByFeedProcedure = publicProcedure
  .meta({
    openapi: {
      ...getSubmissionsByFeedDefinition.meta.openapi,
      tags: [...getSubmissionsByFeedDefinition.meta.openapi.tags],
    },
  })
  .input(GetSubmissionsByFeedInputSchema)
  .output(z.array(selectSubmissionSchema).nullable())
  .query(async ({ ctx, input }) => {
    try {
      const feedService = ctx.sp.getFeedService();
      // This endpoint in Hono was /submissions/feed/:feedId, distinct from /feeds/:feedId/submissions
      // It called feedService.getSubmissionsByFeed
      let submissions = await feedService.getSubmissionsByFeed(input.feedId);

      if (submissions === null) {
        // Check if feed exists to differentiate between "feed not found" and "no submissions for feed"
        const feed = await feedService.getFeedById(input.feedId);
        if (!feed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Feed with ID ${input.feedId} not found.`,
          });
        }
        return []; // Feed exists, but no submissions (service returned null, we return empty array as per schema or null)
        // Contract says nullable, so returning null is also an option.
        // For consistency with original Hono notFound, throwing might be better if feed doesn't exist.
        // If submissions is null because feed not found, throw. If feed exists but no submissions, return [].
      }

      if (input.status) {
        submissions = submissions.filter((sub) => sub.status === input.status);
      }
      return submissions;
    } catch (error) {
      return handleServiceError(error);
    }
  });

// --- Router ---
export const submissionRouter: SubmissionContractRouter = router({
  getAllSubmissions: getAllSubmissionsProcedure,
  getSubmissionById: getSubmissionByIdProcedure,
  getSubmissionsByFeed: getSubmissionsByFeedProcedure,
});

// for catching type errors
const _assertSubmissionRouterConforms: SubmissionContractRouter =
  submissionRouter;
