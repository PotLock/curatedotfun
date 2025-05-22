import { Logger } from "pino";
import { AppConfig, FeedConfig } from "../types/config.zod";
import { SubmissionServiceError } from "../types/errors";
import { ModerationCommandData } from "../types/inbound.types";
import {
  Moderation,
  Submission,
  SubmissionFeed,
  SubmissionStatus,
} from "../types/submission";
import { FeedRepository } from "./db/repositories/feed.repository";
import { SubmissionRepository } from "./db/repositories/submission.repository";
import { DB } from "./db/types";
import { ProcessorService } from "./processor.service";

export class SubmissionService {
  constructor(
    private submissionRepository: SubmissionRepository,
    private feedRepository: FeedRepository,
    private processorService: ProcessorService,
    private db: DB,
    private config: AppConfig,
    private logger: Logger,
  ) { }

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

    this.logger.info(
      { externalId, curatorUsername, targetFeedId, platformKey },
      `Handling submission for externalId: ${externalId}, curator: ${curatorUsername}`,
    );

    try {
      await this.db.transaction(async (tx) => {
        // Blacklist check
        const globalBlacklist = this.config.global.blacklist["all"] || [];
        if (
          curatorUsername &&
          (curatorUsername.toLowerCase() ===
            this.config.global.botId.toLowerCase() ||
            globalBlacklist.some(
              (b) => b.toLowerCase() === curatorUsername.toLowerCase(),
            ))
        ) {
          this.logger.warn(
            { externalId, curatorUsername },
            `Submission from ${curatorUsername} (extId: ${externalId}) blocked: bot or blacklisted.`,
          );
          return;
        }

        // Check if this content was already submitted
        let submissionToProcess =
          await this.submissionRepository.getSubmission(externalId);

        if (!submissionToProcess) {
          if (curatorPlatformId) {
            const dailyCount =
              await this.submissionRepository.getDailySubmissionCount(
                curatorPlatformId,
              );
            if (dailyCount >= this.config.global.maxDailySubmissionsPerUser) {
              this.logger.warn(
                { curatorPlatformId, externalId },
                `Curator ${curatorPlatformId} reached daily submission limit for ${externalId}.`,
              );
              return;
            }
            await this.submissionRepository.incrementDailySubmissionCount(
              curatorPlatformId,
              tx,
            );
          }

          submissionToProcess = { ...newSubmission };
          if (!submissionToProcess.submittedAt)
            submissionToProcess.submittedAt = new Date();
          if (!submissionToProcess.moderationHistory)
            submissionToProcess.moderationHistory = [];

          await this.submissionRepository.saveSubmission(
            submissionToProcess,
            tx,
          );
          this.logger.info(
            { externalId },
            `New submission ${externalId} saved.`,
          );
        } else {
          this.logger.info(
            { externalId },
            `Content ${externalId} already submitted. Processing for additional feeds if any.`,
          );
        }

        const feedIdsToProcess = new Set<string>([targetFeedId]);

        for (const currentFeedId of feedIdsToProcess) {
          const feedConfig = this.config.feeds.find(
            (f) => f.id.toLowerCase() === currentFeedId.toLowerCase(),
          );
          if (!feedConfig) {
            this.logger.warn(
              { currentFeedId, externalId },
              `Feed configuration not found for feedId: ${currentFeedId} for submission ${externalId}.`,
            );
            continue;
          }

          const existingFeedEntry = (submissionToProcess.feeds || []).find(
            (f) => f.feedId.toLowerCase() === currentFeedId.toLowerCase(),
          );

          if (existingFeedEntry) {
            this.logger.info(
              { externalId, currentFeedId, status: existingFeedEntry.status },
              `Submission ${externalId} already exists in feed ${currentFeedId} with status ${existingFeedEntry.status}.`,
            );
            if (
              existingFeedEntry.status === SubmissionStatus.PENDING &&
              curatorUsername &&
              this.isModeratorForFeed(curatorUsername, feedConfig, platformKey)
            ) {
              this.logger.info(
                { curatorUsername, platformKey, externalId, currentFeedId },
                `Moderator ${curatorUsername} (platform: ${platformKey}) re-submitted to pending item ${externalId} in feed ${currentFeedId}. Approving.`,
              );
              await this.autoApproveSubmissionByModerator(
                submissionToProcess,
                feedConfig,
                curatorUsername,
                platformKey,
                curatorActionExternalId,
                newSubmission.curatorNotes,
                tx,
              );
            }
            continue;
          }

          await this.feedRepository.saveSubmissionToFeed(
            externalId,
            feedConfig.id,
            this.config.global.defaultStatus,
            tx,
          );
          this.logger.info(
            {
              externalId,
              feedId: feedConfig.id,
              status: this.config.global.defaultStatus,
            },
            `Submission ${externalId} added to feed ${feedConfig.id} with status ${this.config.global.defaultStatus}.`,
          );

          if (
            curatorUsername &&
            this.isModeratorForFeed(curatorUsername, feedConfig, platformKey)
          ) {
            this.logger.info(
              { externalId, curatorUsername, platformKey, feedId: feedConfig.id },
              `Submission ${externalId} by moderator ${curatorUsername} (platform: ${platformKey}) for feed ${feedConfig.id}. Auto-approving.`,
            );
            await this.autoApproveSubmissionByModerator(
              submissionToProcess,
              feedConfig,
              curatorUsername,
              platformKey,
              curatorActionExternalId,
              newSubmission.curatorNotes,
              tx,
            );
          }
        }
      });
    } catch (error: any) {
      this.logger.error(
        { err: error, externalId },
        `Error handling submission for externalId ${externalId}`,
      );
      if (error instanceof SubmissionServiceError) {
        throw error;
      }
      throw new SubmissionServiceError(
        `Failed to handle submission ${externalId}: ${error.message}`,
        500,
        error,
      );
    }
  }

  private async autoApproveSubmissionByModerator(
    submission: Submission,
    feedConfig: FeedConfig,
    moderatorUsername: string,
    platformKey: string,
    moderatorActionExternalId: string | undefined,
    moderatorNotes: string | null,
    tx: DB,
  ): Promise<void> {
    const moderation: Moderation = {
      adminId: `${moderatorUsername}@${platformKey}`,
      action: "approve",
      timestamp: new Date(),
      tweetId: submission.tweetId,
      feedId: feedConfig.id,
      note: moderatorNotes,
      moderationResponseTweetId: moderatorActionExternalId,
    };

    await this.submissionRepository.saveModerationAction(moderation, tx);
    await this.feedRepository.updateSubmissionFeedStatus(
      submission.tweetId,
      feedConfig.id,
      SubmissionStatus.APPROVED,
      moderatorActionExternalId ?? null,
      tx,
    );
    this.logger.info(
      {
        submissionId: submission.tweetId,
        feedId: feedConfig.id,
        moderator: moderatorUsername,
      },
      `Auto-approved submission ${submission.tweetId} for feed ${feedConfig.id} by moderator ${moderatorUsername}.`,
    );

    if (feedConfig.outputs.stream?.enabled) {
      // For consistency within a transaction, if this read needs to be part of the same snapshot, tx might be preferred
      // However, getSubmission in repo uses executeWithRetry(this.db), so it's not using the tx.
      // This is generally fine for reads unless strict serializable isolation is needed for this read relative to writes.
      const fullSubmission = await this.submissionRepository.getSubmission(
        submission.tweetId,
      );
      if (fullSubmission) {
        // processorService.process is not a DB operation, so it's outside the tx scope concern
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

    this.logger.info(
      { action, targetExternalId, moderatorUsername, platformKey, commandExternalId },
      `Handling moderation command: ${action} for ${targetExternalId} by ${moderatorUsername}@${platformKey}`,
    );

    try {
      await this.db.transaction(async (tx) => {
        if (
          !this.isGlobalAdminOrModeratorForPlatform(
            moderatorUsername,
            platformKey,
          )
        ) {
          this.logger.warn(
            { moderatorUsername, platformKey, commandExternalId },
            `User ${moderatorUsername}@${platformKey} is not an authorized moderator. Moderation command ${commandExternalId} rejected.`,
          );
          return;
        }

        const submission =
          await this.submissionRepository.getSubmission(targetExternalId);
        if (!submission) {
          this.logger.warn(
            { commandExternalId, targetExternalId },
            `Moderation command ${commandExternalId} for non-existent submission ${targetExternalId}.`,
          );
          return;
        }

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
            this.logger.info(
              { commandExternalId, targetFeedId, moderatorUsername, platformKey },
              `Moderation command ${commandExternalId} for feed ${targetFeedId} by ${moderatorUsername}@${platformKey}, but submission is not pending or not in feed.`,
            );
          }
        } else {
          this.logger.warn(
            { moderatorUsername, platformKey, targetFeedId },
            `Moderator ${moderatorUsername}@${platformKey} cannot moderate feed ${targetFeedId} or feed not found.`,
          );
        }

        if (feedsToModerate.length === 0) {
          this.logger.info(
            { moderatorUsername, platformKey, targetExternalId, commandExternalId },
            `No suitable pending feeds found for ${moderatorUsername}@${platformKey} to moderate for submission ${targetExternalId} via command ${commandExternalId}.`,
          );
          return;
        }

        for (const feed of feedsToModerate) {
          const moderation: Moderation = {
            adminId: `${moderatorUsername}@${platformKey}`,
            action,
            timestamp: commandTimestamp,
            tweetId: targetExternalId,
            feedId: feed.id,
            note: notes || null,
            moderationResponseTweetId: commandExternalId,
          };
          await this.submissionRepository.saveModerationAction(moderation, tx);

          const newStatus =
            action === "approve"
              ? SubmissionStatus.APPROVED
              : SubmissionStatus.REJECTED;
          await this.feedRepository.updateSubmissionFeedStatus(
            targetExternalId,
            feed.id,
            newStatus,
            commandExternalId ?? null,
            tx,
          );
          this.logger.info(
            { action, targetExternalId, feedId: feed.id, moderatorUsername },
            `Moderation ${action} for ${targetExternalId} in feed ${feed.id} by ${moderatorUsername} processed.`,
          );

          if (
            newStatus === SubmissionStatus.APPROVED &&
            feed.outputs.stream?.enabled
          ) {
            const fullSubmission =
              await this.submissionRepository.getSubmission(targetExternalId);
            if (fullSubmission) {
              await this.processorService.process(
                fullSubmission,
                feed.outputs.stream,
              );
            }
          }
        }
      });
    } catch (error: any) {
      this.logger.error(
        { err: error, targetExternalId, action, commandExternalId },
        `Error processing moderation for ${targetExternalId} (command ${commandExternalId})`,
      );
      if (error instanceof SubmissionServiceError) {
        throw error;
      }
      throw new SubmissionServiceError(
        `Failed to handle moderation for ${targetExternalId}: ${error.message}`,
        500,
        error,
      );
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
}
