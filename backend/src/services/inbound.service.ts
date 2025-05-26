import { SourceItem } from "@curatedotfun/types";
import { Logger } from "pino";
import { FeedConfig } from "../types/config.zod";
import { AdaptedSourceItem, InterpretedIntent } from "../types/inbound.types";
import { Submission, SubmissionStatus } from "../types/submission";
import { logger } from "../utils/logger";
import { AdapterService } from "./adapter.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { InterpretationService } from "./interpretation.service";
import { SubmissionService } from "./submission.service";

export class InboundService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private adapterService: AdapterService,
    private interpretationService: InterpretationService,
    private submissionService: SubmissionService,
    logger: Logger
  ) {
    this.logger = logger;
  }

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

    // Step 1: Adapt all source items
    const adaptedSourceItems: AdaptedSourceItem[] = sourceItems.map(
      (sourceItem) => {
        const searchId = sourceItem.metadata?.searchId || "unknown_search_id";
        return this.adapterService.adaptItem(sourceItem, feedConfig, searchId);
      },
    );

    // Step 2: Interpret all adapted items
    const interpretedIntents: InterpretedIntent[] = adaptedSourceItems.map(
      (adaptedItem) => {
        return this.interpretationService.interpretItem(
          adaptedItem,
          feedConfig, // Pass feedConfig to interpretation service
        );
      },
    );

    // Store adapted items by their external ID for quick lookup if they are potential targets
    // for pending submission commands.
    const potentialTargetsMap = new Map<string, AdaptedSourceItem>();
    adaptedSourceItems.forEach((item) => {
      if (item.externalId) {
        potentialTargetsMap.set(item.externalId, item);
      }
    });

    // Process intents
    for (const intent of interpretedIntents) {
      try {
        switch (intent.type) {
          case "pendingSubmissionCommandIntent":
            // Attempt to find the target item in the current batch
            const targetAdaptedItem = potentialTargetsMap.get(
              intent.targetExternalId,
            );

            if (targetAdaptedItem) {
              logger.info(
                `InboundService: Found target content ${intent.targetExternalId} for pending command ${intent.adaptedSourceItem.externalId}. Stitching submission.`,
              );

              // Construct the final submission from the target's content and the command's curator info
              const finalSubmission: Submission = {
                tweetId:
                  targetAdaptedItem.externalId ||
                  targetAdaptedItem.sourceInternalId,
                userId: targetAdaptedItem.author?.id || "unknown_author_id",
                username:
                  targetAdaptedItem.author?.username ||
                  targetAdaptedItem.author?.displayName ||
                  "unknown_author",
                content: targetAdaptedItem.content,
                createdAt: targetAdaptedItem.createdAt,
                media: targetAdaptedItem.media,

                curatorId: intent.curatorId,
                curatorUsername: intent.curatorUsername,
                curatorPlatformId: intent.curatorPlatformId,
                curatorTweetId: intent.curatorActionExternalId,
                curatorNotes: intent.curatorNotes || null, // Ensure null if undefined
                submittedAt: intent.submittedAt,

                status: SubmissionStatus.PENDING,
                moderationHistory: [],
                feeds: [],
                // TODO: Future - SubmissionService and Submission type need to be updated to handle potentialTargetFeedNames for routing.
                // For now, intent.potentialTargetFeedNames is available but not used beyond this point.
              };

              await this.submissionService.handleSubmission(
                finalSubmission,
                intent.feedConfig.id, // Use feedId from intent's feedConfig
                intent.adaptedSourceItem.metadata.sourcePlugin,
              );
            } else {
              // TODO: Handle orphaned pending commands.
              // For now, we log. Could involve fetching from DB or queueing.
              logger.warn(
                `InboundService: Target content ${intent.targetExternalId} for pending command ${intent.adaptedSourceItem.externalId} (plugin: ${intent.adaptedSourceItem.metadata.sourcePlugin}) not found in current batch. Command might be orphaned.`,
              );
            }
            break;

          case "directSubmissionIntent":
            logger.info(
              `InboundService: Routing DirectSubmissionIntent (extId: ${intent.submissionData.tweetId}, plugin: ${intent.adaptedSourceItem.metadata.sourcePlugin}) to SubmissionService.`,
            );
            await this.submissionService.handleSubmission(
              intent.submissionData as Submission, // Cast as it's Partial<Submission>
              intent.feedConfig.id,
              intent.adaptedSourceItem.metadata.sourcePlugin,
            );
            break;

          case "contentItemIntent":
            logger.info(
              `InboundService: Routing ContentItemIntent (extId: ${intent.submissionData.tweetId}, plugin: ${intent.adaptedSourceItem.metadata.sourcePlugin}) to SubmissionService.`,
            );
            await this.submissionService.handleSubmission(
              intent.submissionData as Submission, // Cast as it's Partial<Submission>
              intent.feedConfig.id,
              intent.adaptedSourceItem.metadata.sourcePlugin,
            );
            break;

          case "moderationCommandIntent":
            logger.info(
              `InboundService: Routing ModerationCommandIntent (target: ${intent.commandData.targetExternalId}, plugin: ${intent.adaptedSourceItem.metadata.sourcePlugin}) to SubmissionService.`,
            );
            await this.submissionService.handleModeration(
              intent.commandData,
              intent.feedConfig.id,
              intent.adaptedSourceItem.metadata.sourcePlugin,
            );
            break;

          case "unknownIntent":
            logger.warn(
              `InboundService: Encountered an UnknownIntent for item (extId: ${intent.adaptedSourceItem.externalId}, srcId: ${intent.adaptedSourceItem.sourceInternalId}). Error: ${intent.error}`,
            );
            break;

          default:
            // Should not happen with a well-defined discriminated union
            logger.error(
              // @ts-expect-error intent will be `never` here if all cases are handled
              `InboundService: Unhandled interpreted intent type: ${intent.type}`,
            );
        }
      } catch (error) {
        logger.error(
          `InboundService: Error processing interpreted intent (type: ${intent.type}, extId: ${intent.adaptedSourceItem.externalId}):`,
          error,
        );
      }
    }

    logger.info(
      `Finished processing inbound items for feed '${feedConfig.id}'.`,
    );
  }
}
