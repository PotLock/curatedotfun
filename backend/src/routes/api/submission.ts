import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../../types/app";
import { SubmissionStatus } from "../../types/submission";

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
    }),
  ),
  async (c) => {
    const sp = c.get('sp');
    const submissionService = sp.getSubmissionService();
    // Extract validated parameters
    const { page, limit, status } = c.req.valid("query");

    // Get all submissions with the given status
    const allSubmissions = await submissionService.getAllSubmissions(status);

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
submissionRoutes.get("/single/:submissionId", async (c) => {
  const submissionId = c.req.param("submissionId");
  const sp = c.get('sp');
  const submissionService = sp.getSubmissionService();
  const content = await submissionService.getSubmissionById(submissionId);

  if (!content) {
    return c.notFound();
  }

  return c.json(content);
});

/**
 * Get submissions for a specific feed
 */
submissionRoutes.get("/feed/:feedId", async (c) => {
  const feedId = c.req.param("feedId");
  const status = c.req.query("status") as SubmissionStatus | undefined; // Cast for safety
  const sp = c.get('sp');
  const feedService = sp.getFeedService();

  // In FeedService, getSubmissionsByFeed doesn't currently filter by status.
  // We can keep the filtering logic here or enhance FeedService.
  // For now, keeping it here to match existing behavior.
  let submissions = await feedService.getSubmissionsByFeed(feedId);

  if (submissions === null) { // If feed itself not found
    return c.notFound();
  }

  if (status) {
    submissions = submissions.filter((sub) => sub.status === status);
  }

  return c.json(submissions);
});

export { submissionRoutes };
