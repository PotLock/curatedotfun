import { Logger } from "pino";
import { ModerationCommandData } from "../types/inbound.types";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";
import {
  SubmissionRepository,
  FeedRepository,
  type DB,
  SubmissionWithFeedData,
} from "@curatedotfun/shared-db";
import {
  SubmissionStatus,
  Submission,
  SelectSubmission,
  SubmissionServiceError,
  FeedConfig,
} from "@curatedotfun/types";

export class SubmissionService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private submissionRepository: SubmissionRepository,
    private feedRepository: FeedRepository,
    private processorService: ProcessorService,
    private db: DB,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  public async getAllSubmissions(
    status?: SubmissionStatus,
  ): Promise<SubmissionWithFeedData[]> {
    this.logger.info({ status }, "SubmissionService: getAllSubmissions called");
    return this.submissionRepository.getAllSubmissions(status);
  }

  public async getSubmissionById(
    submissionId: string,
  ): Promise<SelectSubmission | null> {
    this.logger.info(
      { submissionId },
      "SubmissionService: getSubmissionById called",
    );
    return this.submissionRepository.getSubmission(submissionId);
  }

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
        // Check if this content was already submitted
        let submissionToProcess =
          await this.submissionRepository.getSubmission(externalId);

        if (!submissionToProcess) {
          if (curatorPlatformId) {
            const dailyCount =
              await this.submissionRepository.getDailySubmissionCount(
                curatorPlatformId,
              );
            // Read MAX_DAILY_SUBMISSIONS_PER_USER from environment variable, default to 10
            const maxDailySubmissions = parseInt(
              process.env.MAX_DAILY_SUBMISSIONS_PER_USER || "10",
              10,
            );
            if (dailyCount >= maxDailySubmissions) {
              this.logger.warn(
                { curatorPlatformId, externalId, maxDailySubmissions },
                `Curator ${curatorPlatformId} reached daily submission limit (${maxDailySubmissions}) for ${externalId}.`,
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

        // The loop body is now async due to fetching feedConfig
        for (const currentFeedId of feedIdsToProcess) {
          const feedConfig =
            await this.feedRepository.getFeedConfig(currentFeedId);
          if (!feedConfig) {
            this.logger.warn(
              { currentFeedId, externalId },
              `Feed configuration not found for feedId: ${currentFeedId} for submission ${externalId}.`,
            );
            continue;
          }

          // Feed-specific blacklist check for author and curator
          if (feedConfig.moderation.blacklist) {
            const platformBlacklist =
              feedConfig.moderation.blacklist[platformKey] || [];
            const allPlatformsBlacklist =
              feedConfig.moderation.blacklist["all"] || [];
            const combinedBlacklist = [
              ...platformBlacklist,
              ...allPlatformsBlacklist,
            ].map((b) => b.toLowerCase());

            if (
              authorUsername &&
              combinedBlacklist.includes(authorUsername.toLowerCase())
            ) {
              this.logger.warn(
                { externalId, authorUsername, currentFeedId, platformKey },
                `Author ${authorUsername} of submission ${externalId} (platform: ${platformKey}) is blacklisted in feed ${currentFeedId}. Skipping processing for this feed.`,
              );
              continue;
            }
            if (
              curatorUsername &&
              combinedBlacklist.includes(curatorUsername.toLowerCase())
            ) {
              this.logger.warn(
                { externalId, curatorUsername, currentFeedId, platformKey },
                `Curator ${curatorUsername} for submission ${externalId} (platform: ${platformKey}) is blacklisted in feed ${currentFeedId}. Skipping processing for this feed.`,
              );
              continue;
            }
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
            SubmissionStatus.PENDING, // Hardcoded default status
            tx,
          );
          this.logger.info(
            {
              externalId,
              feedId: feedConfig.id,
              status: SubmissionStatus.PENDING,
            },
            `Submission ${externalId} added to feed ${feedConfig.id} with status ${SubmissionStatus.PENDING}.`,
          );

          if (
            curatorUsername &&
            this.isModeratorForFeed(curatorUsername, feedConfig, platformKey)
          ) {
            this.logger.info(
              {
                externalId,
                curatorUsername,
                platformKey,
                feedId: feedConfig.id,
              },
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
      {
        action,
        targetExternalId,
        moderatorUsername,
        platformKey,
        commandExternalId,
      },
      `Handling moderation command: ${action} for ${targetExternalId} by ${moderatorUsername}@${platformKey}`,
    );

    try {
      await this.db.transaction(async (tx) => {
        if (
          !(await this.isGlobalAdminOrModeratorForPlatform(
            // Added await
            moderatorUsername,
            platformKey,
          ))
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
        const feedConfig =
          await this.feedRepository.getFeedConfig(targetFeedId);

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
              {
                commandExternalId,
                targetFeedId,
                moderatorUsername,
                platformKey,
              },
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
            {
              moderatorUsername,
              platformKey,
              targetExternalId,
              commandExternalId,
            },
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
  private async isGlobalAdminOrModeratorForPlatform(
    // Made async
    username: string,
    platformKey: string,
  ): Promise<boolean> {
    // Returns Promise<boolean>
    // This check is primarily to see if the user is "known" to the system as a potential moderator on this platform.
    // The more specific `isModeratorForFeed` handles per-feed authorization.
    const normalizedUsername = username.toLowerCase();
    const allFeedConfigs = await this.feedRepository.getAllFeedConfigs(); // Fetch all configs

    for (const feed of allFeedConfigs) {
      // Iterate over fetched configs
      if (feed && feed.moderation?.approvers) {
        // Ensure feed and approvers exist
        const platformApprovers = feed.moderation.approvers[platformKey];
        if (
          platformApprovers &&
          platformApprovers.some(
            (approver: string) => approver.toLowerCase() === normalizedUsername, // Added type for approver
          )
        ) {
          return true; // Found as an approver for this platform on at least one feed
        }
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
        (approver: string) => approver.toLowerCase() === normalizedUsername, // Added type for approver
      );
    }
    return false;
  }
}
