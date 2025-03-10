import { zValidator } from "@hono/zod-validator";
import { db } from "../../services/db";
import { schemas } from "../../types/api";
import { HonoApp } from "../../types/app";

// Create submission routes
const router = HonoApp();

/**
 * Get all submissions with optional pagination
 */
router.get("/", zValidator("query", schemas.pagination), async (c) => {
  const { limit, offset } = c.req.valid("query");

  return c.json(db.getAllSubmissions(limit, offset));
});

/**
 * Get a specific submission by ID
 */
router.get("/single/:submissionId", async (c) => {
  const submissionId = c.req.param("submissionId");
  const content = db.getSubmission(submissionId);

  if (!content) {
    return c.notFound();
  }

  return c.json(content);
});

/**
 * Get submissions for a specific feed
 */
router.get(
  "/feed/:feedId",
  zValidator("query", schemas.pagination),
  async (c) => {
    const context = c.get("context");
    const feedId = c.req.param("feedId");
    const status = c.req.query("status");
    const { limit, offset } = c.req.valid("query");

    const feed = context.configService.getFeedConfig(feedId);
    if (!feed) {
      return c.notFound();
    }

    let submissions = await db.getSubmissionsByFeed(feedId);

    if (status) {
      submissions = submissions.filter((sub) => sub.status === status);
    }

    // Apply pagination if provided
    if (limit || offset) {
      const startIndex = offset || 0;
      const endIndex = limit ? startIndex + limit : undefined;
      submissions = submissions.slice(startIndex, endIndex);
    }

    return c.json(submissions);
  },
);

export default router;
