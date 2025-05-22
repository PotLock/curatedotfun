import { SourceItem } from "@curatedotfun/types";
import { FeedConfig, AppConfig } from "../types/config.zod";
import {
  AdaptedItem,
  AdaptedContentSubmission,
  AdaptedModerationCommand,
  AdaptedPendingSubmissionCommand,
  AdaptedUnknownItem,
} from "../types/inbound.types";
import { Submission, SubmissionStatus } from "../types/submission"; // Added Submission
import { AdapterService } from "./adapter.service";
import { SubmissionService } from "./submission.service";
import { logger } from "../utils/logger";

export class InboundService {
  constructor(
    private adapterService: AdapterService,
    private submissionService: SubmissionService,
    private appConfig: AppConfig, // Kept for potential future use, not directly used in this refactor
  ) {}

  public async processInboundItems(
    sourceItems: SourceItem[],
    feedConfig: FeedConfig,
  ): Promise<void> {
    if (!sourceItems || sourceItems.length === 0) {
      logger.info(`No inbound items to process for feed '${feedConfig.id}'.`);
      return;
    }

    logger.info(
      `Processing ${sourceItems.length} inbound items for feed '${feedConfig.id}'.`,
    );

    const adaptedItems: AdaptedItem[] = sourceItems.map((sourceItem) => {
      const searchId = sourceItem.metadata?.searchId || "unknown_search_id";
      return this.adapterService.adaptItem(sourceItem, feedConfig, searchId);
    });

    const contentSubmissionsMap = new Map<string, AdaptedContentSubmission>();
    const pendingCommands: AdaptedPendingSubmissionCommand[] = [];
    const moderationCommands: AdaptedModerationCommand[] = [];
    const unknownItems: AdaptedUnknownItem[] = [];

    for (const item of adaptedItems) {
      if (item.type === "contentSubmission") {
        // Assuming submission.tweetId is the unique external ID for content
        contentSubmissionsMap.set(item.submission.tweetId, item);
      } else if (item.type === "pendingSubmissionCommand") {
        pendingCommands.push(item);
      } else if (item.type === "moderationCommand") {
        moderationCommands.push(item);
      } else if (item.type === "unknown") {
        unknownItems.push(item);
      }
    }

    // Process pending submission commands (stitching)
    for (const pendingCmd of pendingCommands) {
      try {
        const targetContentSubmission = contentSubmissionsMap.get(
          pendingCmd.targetExternalId,
        );
        if (targetContentSubmission) {
          logger.info(
            `Found target content ${pendingCmd.targetExternalId} for pending command ${pendingCmd.originalSourceItem.externalId}. Stitching submission.`,
          );

          const finalSubmission: Submission = {
            // Content from targetContentSubmission.submission
            tweetId: targetContentSubmission.submission.tweetId,
            userId: targetContentSubmission.submission.userId,
            username: targetContentSubmission.submission.username,
            content: targetContentSubmission.submission.content,
            createdAt: targetContentSubmission.submission.createdAt,
            media: targetContentSubmission.submission.media, // Ensure media is copied

            // Curator info from pendingCmd
            curatorId: pendingCmd.curatorId,
            curatorUsername: pendingCmd.curatorUsername,
            curatorPlatformId: pendingCmd.curatorPlatformId,
            curatorTweetId: pendingCmd.curatorActionExternalId,
            curatorNotes: pendingCmd.curatorNotes,
            submittedAt: pendingCmd.submittedAt,

            // Default/initial values
            status: SubmissionStatus.PENDING,
            moderationHistory: [],
            feeds: [], // SubmissionService will handle adding to feeds
            recapId: null, // Not part of initial submission via command
            // potentialTargetFeedIds: pendingCmd.potentialTargetFeedIds, // If needed by SubmissionService
          };

          await this.submissionService.handleSubmission(
            finalSubmission,
            pendingCmd.feedId,
            pendingCmd.sourcePluginName,
          );
          contentSubmissionsMap.delete(pendingCmd.targetExternalId); // Mark as processed
        } else {
          logger.warn(
            `Target content ${pendingCmd.targetExternalId} for pending command ${pendingCmd.originalSourceItem.externalId} (plugin: ${pendingCmd.sourcePluginName}) not found in current batch. Command might be orphaned.`,
          );
          // Optionally, store orphaned command for later retry or error handling
        }
      } catch (error) {
        logger.error(
          `Error processing stitched submission for pending command ${pendingCmd.originalSourceItem.externalId} (target: ${pendingCmd.targetExternalId}):`,
          error,
        );
      }
    }

    // Process remaining content submissions (direct submissions)
    for (const contentSub of contentSubmissionsMap.values()) {
      try {
        logger.info(
          `Routing direct adapted content submission (extId: ${contentSub.submission.tweetId}, plugin: ${contentSub.sourcePluginName}) to SubmissionService.`,
        );
        await this.submissionService.handleSubmission(
          contentSub.submission,
          contentSub.feedId,
          contentSub.sourcePluginName,
        );
      } catch (error) {
        logger.error(
          `Error processing direct content submission ${contentSub.submission.tweetId} from plugin ${contentSub.sourcePluginName}:`,
          error,
        );
      }
    }

    // Process moderation commands
    for (const modCmd of moderationCommands) {
      try {
        logger.info(
          `Routing adapted moderation command (target: ${modCmd.command.targetExternalId}, plugin: ${modCmd.sourcePluginName}) to SubmissionService.`,
        );
        await this.submissionService.handleModeration(
          modCmd.command,
          modCmd.feedId,
          modCmd.sourcePluginName,
        );
      } catch (error) {
        logger.error(
          `Error processing moderation command for target ${modCmd.command.targetExternalId} from plugin ${modCmd.sourcePluginName}:`,
          error,
        );
      }
    }

    // Log unknown items
    for (const unknown of unknownItems) {
      logger.warn(
        `Encountered an unknown adapted item type for item (extId: ${unknown.originalSourceItem.externalId}, srcId: ${unknown.originalSourceItem.id}). Error: ${unknown.error}`,
      );
    }

    logger.info(
      `Finished processing inbound items for feed '${feedConfig.id}'.`,
    );
  }
}
