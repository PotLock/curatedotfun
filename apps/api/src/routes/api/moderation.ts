import {
  ApiErrorResponseSchema,
  CreateModerationRequestSchema,
  ModerationActionWrappedResponseSchema,
  ModerationActionListWrappedResponseSchema,
  ModerationActionCreatedWrappedResponseSchema,
  ModerationIdParamSchema,
  SubmissionIdParamSchema,
  SubmissionAndFeedIdsParamSchema,
} from "@curatedotfun/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { ModerationService } from "../../services/moderation.service";
import { Env } from "../../types/app";
import { NotFoundError, ServiceError } from "../../types/errors";

export const moderationRoutes = new Hono<Env>();

// Create a new moderation action
moderationRoutes.post(
  "/",
  zValidator("json", CreateModerationRequestSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const sp = c.var.sp;
    const moderationService =
      sp.getService<ModerationService>("moderationService");

    try {
      await moderationService.createModerationAction(payload);
      return c.json(
        ModerationActionCreatedWrappedResponseSchema.parse({
          statusCode: 201,
          success: true,
          data: { message: "Moderation action created successfully." },
        }),
        201,
      );
    } catch (error: any) {
      console.error("Error in moderationRoutes.post('/'):", error);

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to create moderation action" },
        }),
        500,
      );
    }
  },
);

// Get a specific moderation entry by its ID
moderationRoutes.get(
  "/:id",
  zValidator("param", ModerationIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const sp = c.var.sp;
    const moderationService =
      sp.getService<ModerationService>("moderationService");
    try {
      const moderation = await moderationService.getModerationById(id);
      if (!moderation) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: "Moderation entry not found" },
          }),
          404,
        );
      }
      return c.json(
        ModerationActionWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: moderation,
        }),
      );
    } catch (error: any) {
      console.error("Error in moderationRoutes.get('/:id'):", error);

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to get moderation entry" },
        }),
        500,
      );
    }
  },
);

// Get all moderation entries for a submission
moderationRoutes.get(
  "/submission/:submissionId",
  zValidator("param", SubmissionIdParamSchema),
  async (c) => {
    const { submissionId } = c.req.valid("param");
    const sp = c.var.sp;
    const moderationService =
      sp.getService<ModerationService>("moderationService");
    try {
      const moderations =
        await moderationService.getModerationsForSubmission(submissionId);
      return c.json(
        ModerationActionListWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: moderations,
        }),
      );
    } catch (error: any) {
      console.error(
        "Error in moderationRoutes.get('/submission/:submissionId'):",
        error,
      );

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to get moderation entries" },
        }),
        500,
      );
    }
  },
);

// Get all moderation entries for a specific submission within a feed
moderationRoutes.get(
  "/submission/:submissionId/feed/:feedId",
  zValidator("param", SubmissionAndFeedIdsParamSchema),
  async (c) => {
    const { submissionId, feedId } = c.req.valid("param");
    const sp = c.var.sp;
    const moderationService =
      sp.getService<ModerationService>("moderationService");
    try {
      const moderations =
        await moderationService.getModerationsForSubmissionFeed(
          submissionId,
          feedId,
        );
      return c.json(
        ModerationActionListWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: moderations,
        }),
      );
    } catch (error: any) {
      console.error(
        "Error in moderationRoutes.get('/submission/:submissionId/feed/:feedId'):",
        error,
      );

      if (error instanceof NotFoundError || error instanceof ServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to get moderation entries" },
        }),
        500,
      );
    }
  },
);
