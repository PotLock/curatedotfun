import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  feedRepository,
  submissionRepository,
} from "../../services/db/repositories";
import { Env } from "../../types/app";
import { SubmissionStatus } from "../../types/twitter";

const submissionRoutes = new Hono<Env>();

/**
 * Get all submissions with optional status filtering and pagination
 */
submissionRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z
        .enum([
          SubmissionStatus.PENDING,
          SubmissionStatus.APPROVED,
          SubmissionStatus.REJECTED,
        ])
        .optional(),
      sortOrder: z.enum(["newest", "oldest"]).optional().default("newest"),
      q: z.string().optional(),
    }),
  ),
  async (c) => {
    const { page, limit, status, sortOrder, q } = c.req.valid("query");

    const result = await submissionRepository.getAllSubmissions(
      page,
      limit,
      status,
      sortOrder,
      q,
    );

    return c.json(result);
  },
);

/**
 * Get a specific submission by ID
 */
submissionRoutes.get("/single/:submissionId", async (c) => {
  const submissionId = c.req.param("submissionId");
  const content = await submissionRepository.getSubmission(submissionId);

  if (!content) {
    return c.notFound();
  }

  return c.json(content);
});

/**
 * Get submissions for a specific feed
 */
submissionRoutes.get(
  "/feed/:feedId",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z
        .enum([
          SubmissionStatus.PENDING,
          SubmissionStatus.APPROVED,
          SubmissionStatus.REJECTED,
        ])
        .optional(),
      sortOrder: z.enum(["newest", "oldest"]).optional().default("newest"),
      q: z.string().optional(),
    }),
  ),
  async (c) => {
    const feedId = c.req.param("feedId");
    const { page, limit, status, sortOrder, q } = c.req.valid("query");

    const feedExists = await feedRepository.getFeedById(feedId);
    if (!feedExists) {
      return c.notFound();
    }

    const result = await feedRepository.getSubmissionsByFeed(
      feedId,
      page,
      limit,
      status,
      sortOrder,
      q,
    );

    return c.json(result);
  },
);

export { submissionRoutes };
