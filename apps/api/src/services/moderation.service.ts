import { CrosspostClient } from "@crosspost/sdk";
import type { ApiResponse, ConnectedAccountsResponse } from "@crosspost/types";
import {
  DB,
  FeedConfig,
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
  ModerationAction,
  ModerationActionSchema,
} from "@curatedotfun/types";
import { Logger } from "pino";
import {
  AuthorizationError,
  ModerationServiceError,
  NotFoundError,
} from "../types/errors";
import { isSuperAdmin } from "../utils/auth.utils";
import { FeedService } from "./feed.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";

export class ModerationService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly moderationRepository: ModerationRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly processorService: ProcessorService,
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
  ): Promise<{ isAuthorized: boolean; adminIdForHistory: string }> {
    if (isSuperAdmin(actingAccountId, this.superAdminAccounts)) {
      return { isAuthorized: true, adminIdForHistory: actingAccountId };
    }

    for (const configuredApproverId of configuredApproverPlatformIds) {
      if (
        await this.canModerateSubmission(
          actingAccountId,
          submissionPlatform,
          configuredApproverId,
        )
      ) {
        return { isAuthorized: true, adminIdForHistory: configuredApproverId };
      }
    }

    return { isAuthorized: false, adminIdForHistory: actingAccountId };
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

    const connectedAccounts =
      await this.getConnectedAccountsForUser(actingAccountId);

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
      const submission = await this.submissionRepository.getSubmission(
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
      const actingAccountId = payload.adminId; // This is the NEAR account ID
      const feedId = payload.feedId;

      const submissionPlatform = "twitter";

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

      const { isAuthorized, adminIdForHistory } =
        await this.checkModerationAuthorization(
          actingAccountId,
          submissionPlatform,
          configuredApproverPlatformIds,
        );

      if (!isAuthorized) {
        this.logger.warn(
          { actingAccountId, feedId, platform: submissionPlatform },
          "User not authorized to moderate this submission.",
        );
        throw new AuthorizationError(
          "You are not authorized to moderate this submission.",
          403,
        );
      }
      // --- End Permission Check ---

      const moderationActionData: InsertModerationHistory = {
        tweetId: payload.submissionId,
        feedId: payload.feedId,
        adminId: adminIdForHistory,
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
            adminIdForHistory,
            tx,
          );
        } else if (payload.action === "reject") {
          await this.updateStatusAndProcess(
            submission,
            feedEntry,
            submissionStatusZodEnum.Enum.rejected,
            adminIdForHistory,
            tx,
          );
        }
      });

      this.logger.info(
        {
          submissionId: payload.submissionId,
          feedId: payload.feedId,
          action: payload.action,
          adminId: payload.adminId,
        },
        "Moderation action processed successfully via API.",
      );
    } catch (error: any) {
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
        error,
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
    adminId: string,
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
          adminId: adminId,
        },
        `Submission status for ${submission.tweetId} ${newStatus} by ${adminId} on feed ${feedEntry.feedId}.`,
      );

      if (
        newStatus === submissionStatusZodEnum.Enum.approved &&
        feedConfig.outputs?.stream?.enabled
      ) {
        this.logger.info(
          { submissionId: submission.tweetId, feedId: feedEntry.feedId },
          "Processing approved submission for stream.",
        );
        await this.processorService.process(
          submission,
          feedConfig.outputs.stream,
        );
      }
    } catch (error: any) {
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
        error,
      );
    }
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

  private async getConnectedAccountsForUser(
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
