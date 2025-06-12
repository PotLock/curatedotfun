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
  PlatformIdentity,
} from "@curatedotfun/shared-db";
import { Logger } from "pino";
import { FeedService } from "./feed.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";
import { UserService } from "./users.service";
import { isSuperAdmin } from "../utils/auth.utils";
import { FeedConfig } from "@curatedotfun/shared-db";
import { AuthorizationError } from "../types/errors";

export interface CreateModerationApiPayload {
  submissionId: string;
  feedId: string;
  adminId: string;
  action: "approve" | "reject";
  note?: string | null;
  timestamp?: Date;
}

export class ModerationService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly moderationRepository: ModerationRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly processorService: ProcessorService,
    private readonly feedService: FeedService,
    private readonly userService: UserService, // Correctly added UserService
    private readonly superAdminAccounts: string[], // Correctly added superAdminAccounts
    private readonly db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ModerationService.name });
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

    // 2. Fetch the user's profile to get their platform_identities.
    const userProfile =
      await this.userService.findUserByNearAccountId(actingAccountId);
    if (!userProfile || !userProfile.platform_identities) {
      this.logger.warn(
        { actingAccountId },
        "User profile not found or no platform identities for moderation check.",
      );
      return false;
    }

    // 3. Check if any of the user's platform_identities match the given platform and platformSpecificUserIdFromApproverList.
    const platformIdentities =
      userProfile.platform_identities as PlatformIdentity[];
    for (const identity of platformIdentities) {
      if (
        identity.platform === platform &&
        identity.username === platformSpecificUserIdFromApproverList
      ) {
        return true; // User is linked to the specified approver ID on the correct platform.
      }
    }

    this.logger.debug(
      {
        actingAccountId,
        platform,
        platformSpecificUserIdFromApproverList,
        userPlatformIdentities: platformIdentities,
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
    payload: CreateModerationApiPayload,
  ): Promise<void> {
    const submission = await this.submissionRepository.getSubmission(
      payload.submissionId,
    );
    if (!submission) {
      this.logger.error(
        { submissionId: payload.submissionId },
        "Submission not found for moderation action.",
      );
      throw new Error(`Submission ${payload.submissionId} not found.`);
    }

    const feedEntry = submission.feeds.find((f) => f.feedId === payload.feedId);
    if (!feedEntry) {
      this.logger.error(
        { submissionId: payload.submissionId, feedId: payload.feedId },
        "SubmissionFeed entry not found for moderation action.",
      );
      throw new Error(
        `SubmissionFeed entry for submission ${payload.submissionId} and feed ${payload.feedId} not found.`,
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

    let isAuthorized = false;
    let adminIdForHistory = actingAccountId; // Default to NEAR ID (for super admins or if no specific platform match is made but still authorized)

    // Check if super admin first
    if (isSuperAdmin(actingAccountId, this.superAdminAccounts)) {
      isAuthorized = true;
      // adminIdForHistory remains actingAccountId (NEAR ID) for super admin actions
    } else {
      // If not super admin, check against configured platform-specific approvers
      for (const configuredApproverId of configuredApproverPlatformIds) {
        // configuredApproverId is a platform username like "twitterUser123"
        // canModerateSubmission checks if actingAccountId (NEAR) is linked to this configuredApproverId (platform username)
        if (
          await this.canModerateSubmission(
            actingAccountId,
            submissionPlatform,
            configuredApproverId,
          )
        ) {
          isAuthorized = true;
          adminIdForHistory = configuredApproverId; // Log the platform-specific ID that granted permission
          break;
        }
      }
    }

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

    // Prevent re-moderating if not pending (optional, based on desired logic)
    // if (feedEntry.status !== submissionStatusZodEnum.Enum.pending) {
    //   this.logger.warn({ submissionId: payload.submissionId, feedId: payload.feedId, currentStatus: feedEntry.status }, "Submission feed entry is not pending, skipping moderation.");
    //   // Potentially throw an error or return a specific status
    //   return;
    // }

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
          tx,
        );
      } else if (payload.action === "reject") {
        await this.updateStatusAndProcess(
          submission,
          feedEntry,
          submissionStatusZodEnum.Enum.rejected,
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
  }

  /**
   * Internal helper to update submission feed status and process if approved.
   */
  private async updateStatusAndProcess(
    submission: RichSubmission,
    feedEntry: SelectSubmissionFeed,
    newStatus: SubmissionStatus,
    tx: DB,
  ): Promise<void> {
    const feedFromDb = await this.feedService.getFeedById(feedEntry.feedId);
    if (!feedFromDb || !feedFromDb.config) {
      this.logger.error(
        { submissionId: submission.tweetId, feedId: feedEntry.feedId },
        `Feed or feed configuration not found for ${newStatus}.`,
      );
      throw new Error(
        `Feed configuration not found for feed ${feedEntry.feedId}`,
      );
    }
    const feedConfig = feedFromDb.config;

    try {
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
        },
        `Submission status updated to ${newStatus}.`,
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
    } catch (error) {
      this.logger.error(
        {
          error,
          submissionId: submission.tweetId,
          feedId: feedEntry.feedId,
          status: newStatus,
        },
        `Failed to process ${newStatus} submission in ModerationService.`,
      );
      throw error;
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
  public async getModerationById(id: number) {
    return this.moderationRepository.getModerationById(id);
  }

  public async getModerationsForSubmission(submissionId: string) {
    return this.moderationRepository.getModerationsBySubmissionId(submissionId);
  }

  public async getModerationsForSubmissionFeed(
    submissionId: string,
    feedId: string,
  ) {
    return this.moderationRepository.getModerationsBySubmissionFeed(
      submissionId,
      feedId,
    );
  }
}
