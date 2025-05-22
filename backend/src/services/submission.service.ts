import { AppConfig, FeedConfig } from "../types/config.zod";
import {
  Moderation,
  Submission,
  SubmissionFeed,
  SubmissionStatus,
} from "../types/submission.types";
import { ModerationCommandData } from "../types/inbound.types";
import { logger } from "../utils/logger";
import { feedRepository, submissionRepository } from "./db/repositories";
import { ProcessorService } from "./processor.service";

export class SubmissionService {
  constructor(
    private readonly processorService: ProcessorService,
    private readonly config: AppConfig,
  ) {}

  private async initializeFeeds(): Promise<void> {
    try {
      await feedRepository.upsertFeeds(this.config.feeds);
    } catch (error) {
      logger.error("Failed to initialize feeds:", error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeFeeds();
    } catch (error) {
      logger.error("Failed to initialize submission service:", error);
      throw error;
    }
  }

  // Removed startMentionsCheck, checkMentions, stop

  /**
   * Handles a new submission item that has been adapted from a source.
   * @param newSubmission The submission data.
   * @param targetFeedId The specific feed this submission is initially targeted for.
   * @param platformKey Identifier for the source platform (e.g., plugin name) for moderation checks.
   */
  public async handleSubmission(
    newSubmission: Submission,
    targetFeedId: string,
    platformKey: string,
  ): Promise<void> {
    const {
      tweetId: externalId,
      userId: authorPlatformId,
      username: authorUsername,
      curatorId: curatorPlatformId,
      curatorUsername,
      curatorTweetId: curatorActionExternalId,
    } = newSubmission;

    logger.info(
      `Handling submission for externalId: ${externalId}, curator: ${curatorUsername}`,
    );

    try {
      // Blacklist check (example, assuming curatorUsername is the relevant field)
      // This might need to be more nuanced based on which platform the curator is from.
      // For now, assumes a generic blacklist check on curatorUsername.
      const globalBlacklist = this.config.global.blacklist["all"] || []; // Example generic blacklist
      if (
        curatorUsername &&
        (curatorUsername.toLowerCase() ===
          this.config.global.botId.toLowerCase() ||
          globalBlacklist.some(
            (b) => b.toLowerCase() === curatorUsername.toLowerCase(),
          ))
      ) {
        logger.warn(
          `Submission from ${curatorUsername} (extId: ${externalId}) blocked: bot or blacklisted.`,
        );
        return;
      }

      // Check if this content was already submitted
      const existingSubmission =
        await submissionRepository.getSubmission(externalId);
      let submissionToProcess: Submission;

      if (!existingSubmission) {
        // Daily submission limit check (example, using curatorPlatformId)
        if (curatorPlatformId) {
          const dailyCount =
            await submissionRepository.getDailySubmissionCount(
              curatorPlatformId,
            );
          if (dailyCount >= this.config.global.maxDailySubmissionsPerUser) {
            logger.warn(
              `Curator ${curatorPlatformId} reached daily submission limit for ${externalId}.`,
            );
            return;
          }
          await submissionRepository.incrementDailySubmissionCount(
            curatorPlatformId,
          );
        }

        // Save the new submission. newSubmission should have most fields populated by AdapterService.
        // Ensure all required fields are present.
        submissionToProcess = { ...newSubmission }; // Use the already adapted submission
        if (!submissionToProcess.submittedAt)
          submissionToProcess.submittedAt = new Date();
        if (!submissionToProcess.moderationHistory)
          submissionToProcess.moderationHistory = [];

        await submissionRepository.saveSubmission(submissionToProcess);
        logger.info(`New submission ${externalId} saved.`);
      } else {
        logger.info(
          `Content ${externalId} already submitted. Processing for additional feeds if any.`,
        );
        submissionToProcess = existingSubmission;
        // Update curator details if this is a new curation of existing content by a different curator
        // This logic might need refinement based on product requirements.
        // For now, we assume the first curator's details are primary.
      }

      // Determine target feeds.
      // The `targetFeedId` is the primary feed.
      // The `newSubmission.feeds` might contain other feeds identified by AdapterService (e.g. from hashtags).
      // For now, we'll simplify and assume `targetFeedId` is the one to process for.
      // A more complex scenario would merge these.
      const feedIdsToProcess = new Set<string>([targetFeedId]);
      // If newSubmission.feeds (populated by adapter from hashtags for example) is available:
      // (newSubmission.feeds || []).forEach(f => feedIdsToProcess.add(f.feedId));

      for (const currentFeedId of feedIdsToProcess) {
        const feedConfig = this.config.feeds.find(
          (f) => f.id.toLowerCase() === currentFeedId.toLowerCase(),
        );
        if (!feedConfig) {
          logger.warn(
            `Feed configuration not found for feedId: ${currentFeedId} for submission ${externalId}.`,
          );
          continue;
        }

        // Check if submission already exists for this specific feed
        const existingFeedEntry = (submissionToProcess.feeds || []).find(
          (f) => f.feedId.toLowerCase() === currentFeedId.toLowerCase(),
        );

        if (existingFeedEntry) {
          logger.info(
            `Submission ${externalId} already exists in feed ${currentFeedId} with status ${existingFeedEntry.status}.`,
          );
          // Potentially handle re-submission logic if needed
          if (
            existingFeedEntry.status === SubmissionStatus.PENDING &&
            curatorUsername &&
            this.isModeratorForFeed(curatorUsername, feedConfig, platformKey)
          ) {
            logger.info(
              `Moderator ${curatorUsername} (platform: ${platformKey}) re-submitted to pending item ${externalId} in feed ${currentFeedId}. Approving.`,
            );
            await this.autoApproveSubmissionByModerator(
              submissionToProcess,
              feedConfig,
              curatorUsername,
              platformKey,
              curatorActionExternalId,
              newSubmission.curatorNotes,
            );
          }
          continue;
        }

        // Save to feed with default status
        await feedRepository.saveSubmissionToFeed(
          externalId,
          feedConfig.id,
          this.config.global.defaultStatus,
        );
        logger.info(
          `Submission ${externalId} added to feed ${feedConfig.id} with status ${this.config.global.defaultStatus}.`,
        );

        // If the curator is a moderator for this feed, auto-approve
        if (
          curatorUsername &&
          this.isModeratorForFeed(curatorUsername, feedConfig, platformKey)
        ) {
          logger.info(
            `Submission ${externalId} by moderator ${curatorUsername} (platform: ${platformKey}) for feed ${feedConfig.id}. Auto-approving.`,
          );
          await this.autoApproveSubmissionByModerator(
            submissionToProcess,
            feedConfig,
            curatorUsername,
            platformKey,
            curatorActionExternalId,
            newSubmission.curatorNotes,
          );
        }
      }
    } catch (error) {
      logger.error(
        `Error handling submission for externalId ${externalId}:`,
        error,
      );
    }
  }

  private async autoApproveSubmissionByModerator(
    submission: Submission,
    feedConfig: FeedConfig,
    moderatorUsername: string,
    platformKey: string, // Added platformKey
    moderatorActionExternalId: string | undefined,
    moderatorNotes: string | null,
  ): Promise<void> {
    const moderation: Moderation = {
      adminId: `${moderatorUsername}@${platformKey}`, // Store adminId with platform context
      action: "approve",
      timestamp: new Date(),
      tweetId: submission.tweetId, // The ID of the content being approved
      feedId: feedConfig.id,
      note: moderatorNotes, // Notes from the curator/moderator
      moderationResponseTweetId: moderatorActionExternalId,
    };
    await submissionRepository.saveModerationAction(moderation);
    await feedRepository.updateSubmissionFeedStatus(
      submission.tweetId,
      feedConfig.id,
      SubmissionStatus.APPROVED,
      moderatorActionExternalId ?? null, // Pass null if undefined
    );
    logger.info(
      `Auto-approved submission ${submission.tweetId} for feed ${feedConfig.id} by moderator ${moderatorUsername}.`,
    );

    if (feedConfig.outputs.stream?.enabled) {
      // Fetch the full submission details again to ensure it has all latest feed statuses
      const fullSubmission = await submissionRepository.getSubmission(
        submission.tweetId,
      );
      if (fullSubmission) {
        await this.processorService.process(
          fullSubmission,
          feedConfig.outputs.stream,
        );
      }
    }
  }

  /**
   * Handles a moderation command that has been adapted from a source.
   * @param command The moderation command data.
   * @param targetFeedId The specific feed this command is initially targeted for.
   * @param platformKey Identifier for the source platform of the command.
   */
  public async handleModeration(
    command: ModerationCommandData,
    targetFeedId: string,
    platformKey: string,
  ): Promise<void> {
    const {
      targetExternalId,
      action,
      moderatorUsername,
      notes,
      commandExternalId,
      commandTimestamp,
    } = command;

    logger.info(
      `Handling moderation command: ${action} for ${targetExternalId} by ${moderatorUsername}@${platformKey} (commandId: ${commandExternalId})`,
    );

    // Use platformKey for admin check
    if (
      !this.isGlobalAdminOrModeratorForPlatform(moderatorUsername, platformKey)
    ) {
      logger.warn(
        `User ${moderatorUsername}@${platformKey} is not an authorized moderator. Moderation command ${commandExternalId} rejected.`,
      );
      return;
    }

    const submission =
      await submissionRepository.getSubmission(targetExternalId);
    if (!submission) {
      logger.warn(
        `Moderation command ${commandExternalId} for non-existent submission ${targetExternalId}.`,
      );
      return;
    }

    // Determine which feeds this moderation applies to.
    // Could be `targetFeedId` or all feeds the admin can moderate for this submission.
    // For simplicity, let's assume it applies to `targetFeedId` if that feed is pending and moderated by this admin on this platform.
    const feedsToModerate: FeedConfig[] = [];
    const feedConfig = this.config.feeds.find(
      (f) => f.id.toLowerCase() === targetFeedId.toLowerCase(),
    );

    if (
      feedConfig &&
      this.isModeratorForFeed(moderatorUsername, feedConfig, platformKey)
    ) {
      const submissionFeedEntry = (submission.feeds || []).find(
        (sf: SubmissionFeed) =>
          sf.feedId.toLowerCase() === feedConfig.id.toLowerCase(),
      );
      if (
        submissionFeedEntry &&
        submissionFeedEntry.status === SubmissionStatus.PENDING
      ) {
        feedsToModerate.push(feedConfig);
      } else {
        logger.info(
          `Moderation command ${commandExternalId} for feed ${targetFeedId} by ${moderatorUsername}@${platformKey}, but submission is not pending or not in feed.`,
        );
      }
    } else {
      logger.warn(
        `Moderator ${moderatorUsername}@${platformKey} cannot moderate feed ${targetFeedId} or feed not found.`,
      );
    }

    if (feedsToModerate.length === 0) {
      logger.info(
        `No suitable pending feeds found for ${moderatorUsername}@${platformKey} to moderate for submission ${targetExternalId} via command ${commandExternalId}.`,
      );
      return;
    }

    for (const feed of feedsToModerate) {
      try {
        const moderation: Moderation = {
          adminId: `${moderatorUsername}@${platformKey}`, // Store adminId with platform context
          action,
          timestamp: commandTimestamp,
          tweetId: targetExternalId,
          feedId: feed.id,
          note: notes || null,
          moderationResponseTweetId: commandExternalId,
        };
        await submissionRepository.saveModerationAction(moderation);

        const newStatus =
          action === "approve"
            ? SubmissionStatus.APPROVED
            : SubmissionStatus.REJECTED;
        await feedRepository.updateSubmissionFeedStatus(
          targetExternalId,
          feed.id,
          newStatus,
          commandExternalId ?? null, // Pass null if undefined
        );
        logger.info(
          `Moderation ${action} for ${targetExternalId} in feed ${feed.id} by ${moderatorUsername} processed.`,
        );

        if (
          newStatus === SubmissionStatus.APPROVED &&
          feed.outputs.stream?.enabled
        ) {
          // Fetch the full submission to pass to processor, ensuring it has latest state
          const fullSubmission =
            await submissionRepository.getSubmission(targetExternalId);
          if (fullSubmission) {
            await this.processorService.process(
              fullSubmission,
              feed.outputs.stream,
            );
          }
        }
      } catch (error) {
        logger.error(
          `Error processing moderation for ${targetExternalId} in feed ${feed.id}:`,
          error,
        );
      }
    }
  }

  // Check if a user is a global admin (e.g. listed in a global admin list if we had one)
  // OR a moderator for the specific platform (any feed).
  // This is a simplified check. A more robust system might have roles.
  private isGlobalAdminOrModeratorForPlatform(
    username: string,
    platformKey: string,
  ): boolean {
    // For now, we don't have a global admin list in config.
    // So, this check effectively means: "is this user an approver for this platform on *any* feed?"
    // This might be too broad. A stricter check would be `isModeratorForFeed(username, specificFeedConfig, platformKey)`
    // The current call site in `handleModeration` already narrows it down to a specific feed.
    // So, this function could just check if the platformKey exists in *any* feed's approvers for this user.
    // However, the `handleModeration` logic already filters by `targetFeedId`'s `feedConfig`.
    // So, this function can be simplified or its logic incorporated directly.
    // Let's assume for now that if they are a moderator for *any* feed on that platform, they are "known".
    // The actual authorization for a *specific* feed happens in `isModeratorForFeed`.

    // This check is primarily to see if the user is "known" to the system as a potential moderator on this platform.
    // The more specific `isModeratorForFeed` handles per-feed authorization.
    const normalizedUsername = username.toLowerCase();
    for (const feed of this.config.feeds) {
      const platformApprovers = feed.moderation.approvers?.[platformKey];
      if (
        platformApprovers &&
        platformApprovers.some(
          (approver) => approver.toLowerCase() === normalizedUsername,
        )
      ) {
        return true; // Found as an approver for this platform on at least one feed
      }
    }
    // Fallback: check a global admin list if it existed.
    // e.g. if (this.config.global.admins?.[platformKey]?.includes(normalizedUsername)) return true;
    return false;
  }

  // Check if a user (by username) is a moderator for a specific feed on a specific platform
  private isModeratorForFeed(
    username: string,
    feedConfig: FeedConfig,
    platformKey: string,
  ): boolean {
    const normalizedUsername = username.toLowerCase();
    const platformApprovers = feedConfig.moderation.approvers?.[platformKey];
    if (platformApprovers) {
      return platformApprovers.some(
        (approver) => approver.toLowerCase() === normalizedUsername,
      );
    }
    return false;
  }

  // Removed: handleAcknowledgement, processApproval, processRejection (merged into handleModeration)
  // Removed: isAdmin (replaced by isAdminByUsername), getModerationAction, isModeration, isSubmission (moved to AdapterService)
  // Removed: extractDescription, extractNote (moved to AdapterService or handled by it)
}
