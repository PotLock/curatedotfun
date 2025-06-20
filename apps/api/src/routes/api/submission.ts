import {
  SubmissionRepository,
  FeedRepository,
  PaginatedResponse,
  RichSubmission,
} from "@curatedotfun/shared-db";
import {
  Submission as DomainSubmission,
  FeedContextSubmission,
  SubmissionStatus as DomainSubmissionStatus,
  SubmissionStatusEnum as DomainSubmissionStatusEnum,
  SubmissionFeed as DomainSubmissionFeed,
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

    const domainItems: DomainSubmission[] = repoResult.items.map((rs) => {
      let overallStatus: DomainSubmissionStatus =
        DomainSubmissionStatusEnum.PENDING;
      if (rs.moderationHistory && rs.moderationHistory.length > 0) {
        // Prefer direct moderation history for overall status if available
        const approvedAction = rs.moderationHistory.find(
          (mh) => mh.action === "approve",
        );
        const rejectedAction = rs.moderationHistory.find(
          (mh) => mh.action === "reject",
        );

        if (approvedAction) overallStatus = DomainSubmissionStatusEnum.APPROVED;
        else if (rejectedAction)
          overallStatus = DomainSubmissionStatusEnum.REJECTED;
        // If only pending or other actions, it remains PENDING by default
      } else if (rs.feeds && rs.feeds.length > 0) {
        // Fallback to feed statuses if no direct moderation history
        if (rs.feeds.some((f) => f.status === "approved")) {
          overallStatus = DomainSubmissionStatusEnum.APPROVED;
        } else if (rs.feeds.every((f) => f.status === "rejected")) {
          overallStatus = DomainSubmissionStatusEnum.REJECTED;
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
        createdAt: rs.createdAt,
        submittedAt: rs.submittedAt,
        updatedAt: rs.updatedAt,
        moderationHistory: (rs.moderationHistory ?? []).map(
          (mh) =>
            ({
              id: mh.id,
              moderatorAccountId: mh.moderatorAccountId,
              moderatorAccountIdType: mh.moderatorAccountIdType,
              action: mh.action as "approve" | "reject",
              submissionId: mh.submissionId,
              source: mh.source,
              feedId: mh.feedId,
              note: mh.note,
              createdAt: mh.createdAt.toISOString(),
              updatedAt: mh.updatedAt ? mh.updatedAt.toISOString() : mh.createdAt.toISOString(),
            }),
        ),
        feeds: (rs.feeds ?? []).map(
          (sf) =>
            ({
              submissionId: sf.submissionId,
              feedId: sf.feedId,
              status: sf.status as DomainSubmissionStatus,
              createdAt: sf.createdAt,
              updatedAt: sf.updatedAt,
            }) as DomainSubmissionFeed,
        ),
        status: overallStatus,
      };
    });

    const response: PaginatedResponse<DomainSubmission> = {
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

  let overallStatusSingle: DomainSubmissionStatus =
    DomainSubmissionStatusEnum.PENDING;
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
      overallStatusSingle = DomainSubmissionStatusEnum.APPROVED;
    else if (rejectedAction)
      overallStatusSingle = DomainSubmissionStatusEnum.REJECTED;
  } else if (richSubmission.feeds && richSubmission.feeds.length > 0) {
    if (richSubmission.feeds.some((f) => f.status === "approved")) {
      overallStatusSingle = DomainSubmissionStatusEnum.APPROVED;
    } else if (richSubmission.feeds.every((f) => f.status === "rejected")) {
      overallStatusSingle = DomainSubmissionStatusEnum.REJECTED;
    }
  }

  const domainSubmission: DomainSubmission = {
    tweetId: richSubmission.tweetId,
    userId: richSubmission.userId,
    username: richSubmission.username,
    curatorId: richSubmission.curatorId!,
    curatorUsername: richSubmission.curatorUsername!,
    content: richSubmission.content,
    curatorNotes: richSubmission.curatorNotes,
    curatorTweetId: richSubmission.curatorTweetId!,
    createdAt: richSubmission.createdAt,
    submittedAt: richSubmission.submittedAt,
    updatedAt: richSubmission.updatedAt,
    moderationHistory: (richSubmission.moderationHistory ?? []).map(
      (mh) =>
        ({
          id: mh.id,
          moderatorAccountId: mh.moderatorAccountId,
          moderatorAccountIdType: mh.moderatorAccountIdType,
          source: mh.source,
          action: mh.action as "approve" | "reject",
          submissionId: mh.submissionId,
              feedId: mh.feedId,
              note: mh.note,
              createdAt: mh.createdAt.toISOString(),
              updatedAt: mh.updatedAt ? mh.updatedAt.toISOString() : mh.createdAt.toISOString(),
            }),
        ),
        feeds: (richSubmission.feeds ?? []).map(
      (sf) =>
        ({
          submissionId: sf.submissionId,
          feedId: sf.feedId,
          status: sf.status as DomainSubmissionStatus,
          createdAt: sf.createdAt,
          updatedAt: sf.updatedAt,
        }) as DomainSubmissionFeed,
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

      const statusInFeed: DomainSubmissionStatus = specificFeedLink
        ? (specificFeedLink.status as DomainSubmissionStatus)
        : DomainSubmissionStatusEnum.PENDING;

      return {
        tweetId: rs.tweetId,
        userId: rs.userId,
        username: rs.username,
        curatorId: rs.curatorId!,
        curatorUsername: rs.curatorUsername!,
        content: rs.content,
        curatorNotes: rs.curatorNotes,
        curatorTweetId: rs.curatorTweetId!,
        createdAt: rs.createdAt,
        submittedAt: rs.submittedAt,
        updatedAt: rs.updatedAt,
        status: statusInFeed,
        moderationHistory: (rs.moderationHistory ?? []).map(
          (mh) =>
            ({
              id: mh.id,
              moderatorAccountId: mh.moderatorAccountId,
              moderatorAccountIdType: mh.moderatorAccountIdType,
              source: mh.source,
              action: mh.action as "approve" | "reject",
              submissionId: mh.submissionId,
              feedId: mh.feedId,
              note: mh.note,
              createdAt: mh.createdAt.toISOString(),
              updatedAt: mh.updatedAt ? mh.updatedAt.toISOString() : mh.createdAt.toISOString(),
            }),
        ),
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
