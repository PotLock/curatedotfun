import { CrosspostClient } from "@crosspost/sdk";
import type { ApiResponse, ConnectedAccountsResponse } from "@crosspost/types";
import {
  DB,
  FeedRepository,
  InsertModerationHistory,
  ModerationRepository,
  RichSubmission,
  SelectSubmissionFeed,
  SubmissionRepository,
  SubmissionStatus,
  submissionStatusZodEnum,
} from "@curatedotfun/shared-db";
import {
  CreateModerationRequest,
  FeedConfig,
  ModerationAction,
  ModerationActionSchema,
} from "@curatedotfun/types";
import {
  AuthorizationError,
  ModerationServiceError,
  NotFoundError,
} from "@curatedotfun/utils";
import { Logger } from "pino";
import { createQueue, QUEUE_NAMES } from "@curatedotfun/shared-queue"; // Added
import { isSuperAdmin } from "../utils/auth";
import { FeedService } from "./feed.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessingService } from "./processing.service";

export class ModerationService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly moderationRepository: ModerationRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly processingService: ProcessingService,
    private readonly feedService: FeedService,
    private readonly superAdminAccounts: string[],
    private readonly db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ModerationService.name });
  }

  private async checkModerationAuthorization(
    actingAccountId: string,
    submissionPlatform: string,
    configuredApproverPlatformIds: string[],
  ): Promise<boolean> {
    if (isSuperAdmin(actingAccountId, this.superAdminAccounts)) {
      return true;
    }

    for (const configuredApproverId of configuredApproverPlatformIds) {
      if (
        await this.canModerateSubmission(
          actingAccountId,
          submissionPlatform,
          configuredApproverId,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if a user can moderate a submission for a specific feed and platform identity.
   * @param actingAccountId The NEAR account ID of the user performing the action.
   * @param platform The platform of the submission (e.g., "twitter").
   * @param platformSpecificUserIdFromApproverList The platform-specific user ID from the feed's approver list.
   * @returns True if the user is authorized, false otherwise.
   */
  public async canModerateSubmission(
    actingAccountId: string | null,
    platform: string,
    platformSpecificUserIdFromApproverList: string,
  ): Promise<boolean> {
    if (!actingAccountId) {
      return false;
    }

    // 1. Check if the actingAccountId is a Super Admin.
    if (isSuperAdmin(actingAccountId, this.superAdminAccounts)) {
      return true;
    }

    const connectedAccounts = await this.getConnectedAccounts(actingAccountId);

    if (connectedAccounts && connectedAccounts.length > 0) {
      for (const identity of connectedAccounts) {
        if (
          identity.platform === platform &&
          identity.profile?.username === platformSpecificUserIdFromApproverList
        ) {
          return true; // User is linked to the specified approver ID on the correct platform.
        }
      }
    }

    this.logger.debug(
      {
        actingAccountId,
        platform,
        platformSpecificUserIdFromApproverList,
        userPlatformIdentities: connectedAccounts,
      },
      "User does not have matching platform identity for moderation.",
    );
    return false;
  }

  /**
   * Creates a moderation action based on API input.
   * This is the primary method the new API routes will call.
   */
  public async createModerationAction(
    payload: CreateModerationRequest,
  ): Promise<void> {
    try {
      const submission = await this.submissionRepository.getRichSubmission(
        payload.submissionId,
      );
      if (!submission) {
        this.logger.error(
          { submissionId: payload.submissionId },
          "Submission not found for moderation action.",
        );
        throw new NotFoundError("Submission", payload.submissionId);
      }

      const feedEntry = submission.feeds.find(
        (f) => f.feedId === payload.feedId,
      );
      if (!feedEntry) {
        this.logger.error(
          { submissionId: payload.submissionId, feedId: payload.feedId },
          "SubmissionFeed entry not found for moderation action.",
        );
        throw new NotFoundError(
          `SubmissionFeed entry for submission ${payload.submissionId} and feed ${payload.feedId}`,
        );
      }

      // --- Permission Check ---
      const moderatorAccountId = payload.moderatorAccountId;
      const feedId = payload.feedId;
      const isAutoApproval = payload.source === "auto_approval";

      if (!isAutoApproval) {
        const submissionPlatform = "twitter"; // TODO: dynamic, tied to source

        const feedConfig: FeedConfig | null =
          await this.feedRepository.getFeedConfig(feedId);

        if (
          !feedConfig ||
          !feedConfig.moderation ||
          !feedConfig.moderation.approvers
        ) {
          this.logger.warn(
            { feedId },
            "Feed config, moderation settings, or approvers not found for permission check.",
          );
          throw new AuthorizationError(
            "Moderation not configured for this feed.",
            403,
          );
        }

        const configuredApproverPlatformIds =
          feedConfig.moderation.approvers[submissionPlatform];

        if (
          !configuredApproverPlatformIds ||
          configuredApproverPlatformIds.length === 0
        ) {
          this.logger.warn(
            { feedId, platform: submissionPlatform },
            "No approvers configured for this platform on the feed.",
          );
          throw new AuthorizationError(
            `No approvers configured for platform '${submissionPlatform}' on this feed.`,
            403,
          );
        }

        const isAuthorized = await this.checkModerationAuthorization(
          moderatorAccountId,
          submissionPlatform,
          configuredApproverPlatformIds,
        );

        if (!isAuthorized) {
          this.logger.warn(
            {
              actingAccountId: moderatorAccountId,
              feedId,
              platform: submissionPlatform,
            },
            "User not authorized to moderate this submission.",
          );
          throw new AuthorizationError(
            "You are not authorized to moderate this submission.",
            403,
          );
        }
      }
      // --- End Permission Check ---

      const moderationSource =
        !isAutoApproval &&
        isSuperAdmin(moderatorAccountId, this.superAdminAccounts)
          ? "super_admin_direct"
          : payload.source;

      const moderationActionData: InsertModerationHistory = {
        submissionId: payload.submissionId,
        feedId: payload.feedId,
        moderatorAccountId: moderatorAccountId,
        moderatorAccountIdType: payload.moderatorAccountIdType,
        source: moderationSource,
        action: payload.action,
        note: payload.note || null,
      };

      await this.db.transaction(async (tx) => {
        await this.moderationRepository.saveModerationAction(
          moderationActionData,
          tx,
        );

        if (payload.action === "approve") {
          await this.updateStatusAndProcess(
            submission,
            feedEntry,
            submissionStatusZodEnum.Enum.approved,
            moderatorAccountId,
            tx,
          );
        } else if (payload.action === "reject") {
          await this.updateStatusAndProcess(
            submission,
            feedEntry,
            submissionStatusZodEnum.Enum.rejected,
            moderatorAccountId,
            tx,
          );
        }
      });

      this.logger.info(
        {
          submissionId: payload.submissionId,
          feedId: payload.feedId,
          action: payload.action,
          moderatorAccountId: moderatorAccountId,
        },
        "Moderation action processed successfully via API.",
      );
    } catch (error: unknown) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof ModerationServiceError
      ) {
        throw error;
      }
      this.logger.error(
        { error, payload },
        "Failed to create moderation action.",
      );
      throw new ModerationServiceError(
        "Failed to create moderation action",
        500,
        {
          cause: error as Error,
        },
      );
    }
  }

  /**
   * Internal helper to update submission feed status and process if approved.
   */
  private async updateStatusAndProcess(
    submission: RichSubmission,
    feedEntry: SelectSubmissionFeed,
    newStatus: SubmissionStatus,
    moderatorAccountId: string,
    tx: DB,
  ): Promise<void> {
    try {
      const feedFromDb = await this.feedService.getFeedById(feedEntry.feedId);
      if (!feedFromDb || !feedFromDb.config) {
        this.logger.error(
          { submissionId: submission.tweetId, feedId: feedEntry.feedId },
          `Feed or feed configuration not found for ${newStatus}.`,
        );
        throw new NotFoundError(
          "Feed configuration",
          `feed ${feedEntry.feedId}`,
        );
      }
      const feedConfig = feedFromDb.config;

      await this.feedRepository.updateSubmissionFeedStatus(
        submission.tweetId,
        feedEntry.feedId,
        newStatus,
        tx,
      );

      this.logger.info(
        {
          submissionId: submission.tweetId,
          feedId: feedEntry.feedId,
          status: newStatus,
          moderatorAccountId: moderatorAccountId,
        },
        `Submission status for ${submission.tweetId} ${newStatus} by ${moderatorAccountId} on feed ${feedEntry.feedId}.`,
      );

      if (
        newStatus === submissionStatusZodEnum.Enum.approved &&
        feedConfig.outputs?.stream?.enabled
      ) {
        this.logger.info(
          { submissionId: submission.tweetId, feedId: feedEntry.feedId },
          "Enqueueing approved submission for stream processing.",
        );
        // Enqueue to SUBMISSION_PROCESSING_QUEUE instead of direct call
        const processingQueue = createQueue(QUEUE_NAMES.SUBMISSION_PROCESSING);
        await processingQueue.add(QUEUE_NAMES.SUBMISSION_PROCESSING, {
          submissionId: submission.tweetId,
          feedId: feedEntry.feedId,
        });
        // The actual call to processorService.process will be done by the worker for SUBMISSION_PROCESSING_QUEUE
      }
    } catch (error: unknown) {
      if (
        error instanceof NotFoundError ||
        error instanceof ModerationServiceError
      ) {
        throw error;
      }
      this.logger.error(
        {
          error,
          submissionId: submission.tweetId,
          feedId: feedEntry.feedId,
          status: newStatus,
        },
        `Failed to process ${newStatus} submission in ModerationService.`,
      );
      throw new ModerationServiceError(
        `Failed to process ${newStatus} submission`,
        500,
        { cause: error as Error },
      );
    }
  }

  public async attemptAutoApproval(
    submission: RichSubmission,
    feedConfig: FeedConfig,
    curatorUsername: string,
    tx: DB,
  ): Promise<boolean> {
    if (
      !feedConfig?.moderation?.approvers?.twitter?.includes(curatorUsername)
    ) {
      return false;
    }

    const feedEntry = submission.feeds.find((f) => f.feedId === feedConfig.id);

    if (!feedEntry) {
      this.logger.error(
        { submissionId: submission.tweetId, feedId: feedConfig.id },
        "Could not find corresponding feed entry in submission for auto-approval.",
      );
      return false;
    }

    const moderationActionData: InsertModerationHistory = {
      submissionId: submission.tweetId,
      feedId: feedConfig.id,
      moderatorAccountId: curatorUsername,
      moderatorAccountIdType: "platform_username",
      source: "auto_approval",
      action: "approve",
    };

    await this.moderationRepository.saveModerationAction(
      moderationActionData,
      tx,
    );

    // Instead of calling updateStatusAndProcess directly,
    // enqueue a job to the MODERATION_QUEUE.
    // The transaction `tx` here is only for saving the moderation history.
    // The actual moderation action (approve/reject and subsequent processing)
    // will be handled by the MODERATION_QUEUE worker.

    const moderationQueue = createQueue(QUEUE_NAMES.MODERATION);
    await moderationQueue.add(QUEUE_NAMES.MODERATION, {
      submissionId: submission.tweetId,
      feedId: feedConfig.id,
      action: "approve",
      moderatorAccountId: curatorUsername,
      moderatorAccountIdType: "platform_username",
      source: "auto_approval",
      note: "Auto-approved by curator.", // Or some other relevant note
    });

    this.logger.info(
      {
        submissionId: submission.tweetId,
        feedId: feedConfig.id,
        curatorUsername,
      },
      "Submission auto-approved.",
    );
    return true;
  }

  /**
   * Checks if a given user account ID has permission to moderate a specific feed.
   * @param feedId The ID of the feed.
   * @param actingAccountId The NEAR account ID of the user attempting to moderate.
   * @returns True if the user is authorized, false otherwise.
   */
  public async checkUserFeedModerationPermission(
    feedId: string,
    actingAccountId: string | null,
  ): Promise<boolean> {
    if (!actingAccountId) {
      this.logger.debug(
        { feedId },
        "Permission check failed: No acting account ID provided.",
      );
      return false;
    }

    // 1. Check if the actingAccountId is a Super Admin.
    if (isSuperAdmin(actingAccountId, this.superAdminAccounts)) {
      this.logger.debug(
        { feedId, actingAccountId },
        "Permission granted: User is a super admin.",
      );
      return true;
    }

    // 2. Fetch the feed configuration.
    const feedConfig: FeedConfig | null =
      await this.feedRepository.getFeedConfig(feedId);

    if (
      !feedConfig ||
      !feedConfig.moderation ||
      !feedConfig.moderation.approvers
    ) {
      this.logger.warn(
        { feedId, actingAccountId },
        "Permission check failed: Feed config, moderation settings, or approvers not found for this feed.",
      );
      return false;
    }

    const submissionPlatform = "twitter";

    const configuredApproverPlatformIds =
      feedConfig.moderation.approvers[submissionPlatform];

    if (
      !configuredApproverPlatformIds ||
      configuredApproverPlatformIds.length === 0
    ) {
      this.logger.warn(
        { feedId, actingAccountId, platform: submissionPlatform },
        `Permission check failed: No approvers configured for platform '${submissionPlatform}' on this feed.`,
      );
      return false;
    }

    // 3. Check if the actingAccountId (NEAR ID) is linked to any of the configured platform-specific approver IDs.
    for (const configuredApproverId of configuredApproverPlatformIds) {
      // configuredApproverId is a platform username (e.g., "twitterUser123")
      // this.canModerateSubmission checks if actingAccountId (NEAR) is linked to this configuredApproverId (platform username)
      if (
        await this.canModerateSubmission(
          actingAccountId,
          submissionPlatform,
          configuredApproverId,
        )
      ) {
        this.logger.debug(
          {
            feedId,
            actingAccountId,
            platform: submissionPlatform,
            matchedApprover: configuredApproverId,
          },
          "Permission granted: User's NEAR account is linked to a configured approver for the platform.",
        );
        return true;
      }
    }

    this.logger.warn(
      {
        feedId,
        actingAccountId,
        platform: submissionPlatform,
        configuredApprovers: configuredApproverPlatformIds,
      },
      "Permission denied: User's NEAR account is not linked to any configured approvers for the platform on this feed.",
    );
    return false;
  }

  // --- Methods for API routes to get moderation data ---
  public async getModerationById(id: number): Promise<ModerationAction | null> {
    const moderation = await this.moderationRepository.getModerationById(id);
    if (!moderation) {
      return null;
    }
    return ModerationActionSchema.parse(moderation);
  }

  public async getModerationsForSubmission(
    submissionId: string,
  ): Promise<ModerationAction[]> {
    const moderations =
      await this.moderationRepository.getModerationsBySubmissionId(
        submissionId,
      );
    return moderations.map((m) => ModerationActionSchema.parse(m));
  }

  public async getModerationsForSubmissionFeed(
    submissionId: string,
    feedId: string,
  ): Promise<ModerationAction[]> {
    const moderations =
      await this.moderationRepository.getModerationsBySubmissionFeed(
        submissionId,
        feedId,
      );
    return moderations.map((m) => ModerationActionSchema.parse(m));
  }

  public async getModerationsByNearAccount(
    nearAccountId: string,
  ): Promise<ModerationAction[]> {
    const connectedAccounts = await this.getConnectedAccounts(nearAccountId);
    const platformUsernameStrings: string[] = [];

    if (connectedAccounts) {
      for (const acc of connectedAccounts) {
        if (acc.platform && acc.profile?.username) {
          platformUsernameStrings.push(
            `${acc.platform}:${acc.profile.username}`,
          );
        }
      }
    }

    const rawModerations =
      await this.moderationRepository.getModerationsLinkedToNearAccount(
        nearAccountId,
        platformUsernameStrings,
      );
    return rawModerations.map((m) => ModerationActionSchema.parse(m));
  }

  private async getConnectedAccounts(
    actingAccountId: string,
  ): Promise<ConnectedAccountsResponse["accounts"] | null> {
    try {
      const crosspost = new CrosspostClient();
      crosspost.setAccountHeader(actingAccountId);
      const response: ApiResponse<ConnectedAccountsResponse> =
        await crosspost.auth.getConnectedAccounts();
      if (response.success && response.data?.accounts) {
        return response.data.accounts;
      }
      this.logger.warn(
        { actingAccountId, error: response.errors }, // Assuming 'errors' is the correct property
        "Failed to fetch connected accounts from Crosspost API or no accounts found.",
      );
      return null;
    } catch (error) {
      this.logger.error(
        { actingAccountId, error },
        "Error calling Crosspost API for connected accounts",
      );
      return null;
    }
  }
}
