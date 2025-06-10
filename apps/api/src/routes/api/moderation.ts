import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ModerationService } from "../../services/moderation.service";
import { Env } from "../../types/app";

const createModerationSchema = z.object({
  submissionId: z.string().min(1),
  feedId: z.string().min(1),
  adminId: z.string().min(1), // TODO: real user
  action: z.enum(["approve", "reject"]),
  note: z.string().optional().nullable(),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const moderationRoutes = new Hono<Env>();

// Create a new moderation action
moderationRoutes.post(
  "/",
  zValidator("json", createModerationSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const sp = c.var.sp;
    const moderationService =
      sp.getService<ModerationService>("moderationService");

    try {
      await moderationService.createModerationAction(payload);
      return c.json(
        { message: "Moderation action created successfully." },
        201,
      );
    } catch (error: any) {
      return c.json(
        { error: error.message || "Failed to create moderation action" },
        500,
      );
    }
  },
);

// Get a specific moderation entry by its ID
moderationRoutes.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) {
    return c.json({ error: "Invalid moderation ID" }, 400);
  }
  const sp = c.var.sp;
  const moderationService =
    sp.getService<ModerationService>("moderationService");
  try {
    const moderation = await moderationService.getModerationById(id);
    if (!moderation) {
      return c.json({ error: "Moderation entry not found" }, 404);
    }
    return c.json(moderation);
  } catch (error: any) {
    return c.json(
      { error: error.message || "Failed to get moderation entry" },
      500,
    );
  }
});

// Get all moderation entries for a submission
moderationRoutes.get("/submission/:submissionId", async (c) => {
  const submissionId = c.req.param("submissionId");
  const sp = c.var.sp;
  const moderationService =
    sp.getService<ModerationService>("moderationService");
  try {
    const moderations =
      await moderationService.getModerationsForSubmission(submissionId);
    return c.json(moderations);
  } catch (error: any) {
    return c.json(
      { error: error.message || "Failed to get moderation entries" },
      500,
    );
  }
});

// Get all moderation entries for a specific submission within a feed
moderationRoutes.get("/submission/:submissionId/feed/:feedId", async (c) => {
  const submissionId = c.req.param("submissionId");
  const feedId = c.req.param("feedId");
  const sp = c.var.sp;
  const moderationService =
    sp.getService<ModerationService>("moderationService");
  try {
    const moderations = await moderationService.getModerationsForSubmissionFeed(
      submissionId,
      feedId,
    );
    return c.json(moderations);
  } catch (error: any) {
    return c.json(
      { error: error.message || "Failed to get moderation entries" },
      500,
    );
  }
});
