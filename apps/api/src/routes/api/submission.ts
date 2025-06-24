import {
  SubmissionRepository,
  FeedRepository,
  PaginatedResponse,
  RichSubmission,
} from "@curatedotfun/shared-db";
import {
  FeedContextSubmission,
  Submission,
  SubmissionFeed,
  SubmissionStatus,
  SubmissionStatusSchema,
} from "@curatedotfun/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { Env } from "../../types/app";

const submissionRoutes = new Hono<Env>();

/**
 * Get all submissions with optional status filtering and pagination
 */
submissionRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      sortOrder: z.enum(["newest", "oldest"]).optional().default("newest"),
      q: z.string().optional(),
    }),
  ),
  async (c) => {
    const db = c.get("db");
    const submissionRepository = new SubmissionRepository(db);
    const { page, limit, status, sortOrder, q } = c.req.valid("query");

    const repoResult: PaginatedResponse<RichSubmission> =
      await submissionRepository.getAllSubmissions(
        status,
        sortOrder,
        q,
        page,
        limit,
      );

    const domainItems: Submission[] = repoResult.items.map((rs) => {
      let overallStatus: SubmissionStatus = SubmissionStatusSchema.enum.pending;
      if (rs.moderationHistory && rs.moderationHistory.length > 0) {
        // Prefer direct moderation history for overall status if available
        const approvedAction = rs.moderationHistory.find(
          (mh) => mh.action === "approve",
        );
        const rejectedAction = rs.moderationHistory.find(
          (mh) => mh.action === "reject",
        );

        if (approvedAction)
          overallStatus = SubmissionStatusSchema.enum.approved;
        else if (rejectedAction)
          overallStatus = SubmissionStatusSchema.enum.rejected;
        // If only pending or other actions, it remains PENDING by default
      } else if (rs.feeds && rs.feeds.length > 0) {
        // Fallback to feed statuses if no direct moderation history
        if (rs.feeds.some((f) => f.status === "approved")) {
          overallStatus = SubmissionStatusSchema.enum.approved;
        } else if (rs.feeds.every((f) => f.status === "rejected")) {
          overallStatus = SubmissionStatusSchema.enum.rejected;
        }
        // If feeds are all pending, it remains PENDING
      }

      return {
        tweetId: rs.tweetId,
        userId: rs.userId,
        username: rs.username,
        curatorId: rs.curatorId!,
        curatorUsername: rs.curatorUsername!,
        content: rs.content,
        curatorNotes: rs.curatorNotes,
        curatorTweetId: rs.curatorTweetId!,
        createdAt: rs.createdAt.toISOString(),
        submittedAt: rs.submittedAt ? rs.submittedAt.toISOString() : null,
        updatedAt: rs.updatedAt ? rs.updatedAt.toISOString() : null,
        moderationHistory: (rs.moderationHistory ?? []).map((mh) => ({
          id: mh.id,
          moderatorAccountId: mh.moderatorAccountId,
          moderatorAccountIdType: mh.moderatorAccountIdType,
          action: mh.action as "approve" | "reject",
          submissionId: mh.submissionId,
          source: mh.source,
          feedId: mh.feedId,
          note: mh.note,
          createdAt: mh.createdAt.toISOString(),
          updatedAt: mh.updatedAt
            ? mh.updatedAt.toISOString()
            : mh.createdAt.toISOString(),
        })),
        feeds: (rs.feeds ?? []).map(
          (sf) =>
            ({
              submissionId: sf.submissionId,
              feedId: sf.feedId,
              status: sf.status as SubmissionStatus,
              createdAt: sf.createdAt.toISOString(),
              updatedAt: sf.updatedAt ? sf.updatedAt.toISOString() : null,
            }) as SubmissionFeed,
        ),
        status: overallStatus,
      };
    });

    const response: PaginatedResponse<Submission> = {
      items: domainItems,
      pagination: repoResult.pagination,
    };

    return c.json(response);
  },
);

/**
 * Get a specific submission by ID
 */
submissionRoutes.get("/single/:submissionId", async (c) => {
  const db = c.get("db");
  const submissionRepository = new SubmissionRepository(db);
  const submissionId = c.req.param("submissionId");
  const richSubmission = await submissionRepository.getSubmission(submissionId);

  if (!richSubmission) {
    return c.notFound();
  }

  let overallStatusSingle: SubmissionStatus =
    SubmissionStatusSchema.enum.pending;
  if (
    richSubmission.moderationHistory &&
    richSubmission.moderationHistory.length > 0
  ) {
    const approvedAction = richSubmission.moderationHistory.find(
      (mh) => mh.action === "approve",
    );
    const rejectedAction = richSubmission.moderationHistory.find(
      (mh) => mh.action === "reject",
    );

    if (approvedAction)
      overallStatusSingle = SubmissionStatusSchema.enum.approved;
    else if (rejectedAction)
      overallStatusSingle = SubmissionStatusSchema.enum.rejected;
  } else if (richSubmission.feeds && richSubmission.feeds.length > 0) {
    if (richSubmission.feeds.some((f) => f.status === "approved")) {
      overallStatusSingle = SubmissionStatusSchema.enum.approved;
    } else if (richSubmission.feeds.every((f) => f.status === "rejected")) {
      overallStatusSingle = SubmissionStatusSchema.enum.rejected;
    }
  }

  const domainSubmission: Submission = {
    tweetId: richSubmission.tweetId,
    userId: richSubmission.userId,
    username: richSubmission.username,
    curatorId: richSubmission.curatorId!,
    curatorUsername: richSubmission.curatorUsername!,
    content: richSubmission.content,
    curatorNotes: richSubmission.curatorNotes,
    curatorTweetId: richSubmission.curatorTweetId!,
    createdAt: richSubmission.createdAt.toISOString(),
    submittedAt: richSubmission.submittedAt
      ? richSubmission.submittedAt.toISOString()
      : null,
    updatedAt: richSubmission.updatedAt
      ? richSubmission.updatedAt.toISOString()
      : null,
    moderationHistory: (richSubmission.moderationHistory ?? []).map((mh) => ({
      id: mh.id,
      moderatorAccountId: mh.moderatorAccountId,
      moderatorAccountIdType: mh.moderatorAccountIdType,
      source: mh.source,
      action: mh.action as "approve" | "reject",
      submissionId: mh.submissionId,
      feedId: mh.feedId,
      note: mh.note,
      createdAt: mh.createdAt.toISOString(),
      updatedAt: mh.updatedAt
        ? mh.updatedAt.toISOString()
        : mh.createdAt.toISOString(),
    })),
    feeds: (richSubmission.feeds ?? []).map(
      (sf) =>
        ({
          submissionId: sf.submissionId,
          feedId: sf.feedId,
          status: sf.status as SubmissionStatus,
          createdAt: sf.createdAt.toISOString(),
          updatedAt: sf.updatedAt ? sf.updatedAt.toISOString() : null,
        }) as SubmissionFeed,
    ),
    status: overallStatusSingle,
  };

  return c.json(domainSubmission);
});

/**
 * Get submissions for a specific feed
 */
submissionRoutes.get(
  "/feed/:feedId",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      sortOrder: z.enum(["newest", "oldest"]).optional().default("newest"),
      q: z.string().optional(),
    }),
  ),
  async (c) => {
    const db = c.get("db");
    const feedRepository = new FeedRepository(db);
    const feedIdParam = c.req.param("feedId");
    const { page, limit, status, sortOrder, q } = c.req.valid("query");

    const repoResult: PaginatedResponse<RichSubmission> =
      await feedRepository.getSubmissionsByFeed(
        feedIdParam,
        status,
        sortOrder,
        q,
        page,
        limit,
      );

    const domainItems: FeedContextSubmission[] = repoResult.items.map((rs) => {
      const specificFeedLink = rs.feeds.find((f) => f.feedId === feedIdParam);

      const statusInFeed: SubmissionStatus = specificFeedLink
        ? (specificFeedLink.status as SubmissionStatus)
        : SubmissionStatusSchema.enum.pending;

      return {
        tweetId: rs.tweetId,
        userId: rs.userId,
        username: rs.username,
        curatorId: rs.curatorId!,
        curatorUsername: rs.curatorUsername!,
        content: rs.content,
        curatorNotes: rs.curatorNotes,
        curatorTweetId: rs.curatorTweetId!,
        createdAt: rs.createdAt.toISOString(),
        submittedAt: rs.submittedAt ? rs.submittedAt.toISOString() : null,
        updatedAt: rs.updatedAt ? rs.updatedAt.toISOString() : null,
        status: statusInFeed,
        moderationHistory: (rs.moderationHistory ?? []).map((mh) => ({
          id: mh.id,
          moderatorAccountId: mh.moderatorAccountId,
          moderatorAccountIdType: mh.moderatorAccountIdType,
          source: mh.source,
          action: mh.action as "approve" | "reject",
          submissionId: mh.submissionId,
          feedId: mh.feedId,
          note: mh.note,
          createdAt: mh.createdAt.toISOString(),
          updatedAt: mh.updatedAt
            ? mh.updatedAt.toISOString()
            : mh.createdAt.toISOString(),
        })),
      };
    });

    const response: PaginatedResponse<FeedContextSubmission> = {
      items: domainItems,
      pagination: repoResult.pagination,
    };

    return c.json(response);
  },
);

export { submissionRoutes };
