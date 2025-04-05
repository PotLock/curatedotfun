import {
  submissionRepository,
  feedRepository,
} from "../../services/db/repositories";
import { HonoApp } from "../../types/app";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { SubmissionStatus } from "../../types/twitter";

// Create submission routes
const router = HonoApp();

/**
 * Get all submissions with optional status filtering and pagination
 */
router.get(
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
    }),
  ),
  async (c) => {
    // Extract validated parameters
    const { page, limit, status } = c.req.valid("query");

    // Get all submissions with the given status
    const allSubmissions = await submissionRepository.getAllSubmissions(status);

    // Sort submissions by submittedAt date (newest first)
    allSubmissions.sort(
      (a, b) =>
        new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime(),
    );

    // Get total count for pagination metadata
    const totalCount = allSubmissions.length;

    // Apply pagination
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedSubmissions = allSubmissions.slice(startIndex, endIndex);

    // Return data with pagination metadata
    return c.json({
      items: paginatedSubmissions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: endIndex < totalCount,
      },
    });
  },
);

/**
 * Get a specific submission by ID
 */
router.get("/single/:submissionId", async (c) => {
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
router.get("/feed/:feedId", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");
  const status = c.req.query("status");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  let submissions = await feedRepository.getSubmissionsByFeed(feedId);

  if (status) {
    submissions = submissions.filter((sub) => sub.status === status);
  }

  return c.json(submissions);
});

export default router;
