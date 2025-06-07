import {
  DB,
  FeedConfig,
  FeedRepository,
  InsertModerationHistory,
  RichSubmission,
  SelectSubmissionFeed,
  SubmissionRepository,
  submissionStatusZodEnum,
} from "@curatedotfun/shared-db";
import {
  CuratedItem,
  CuratedItemStatus,
  ItemModerationEvent,
} from "@curatedotfun/types";
import { Effect } from "effect";
import { Logger } from "pino";
import { ModerationError } from "../types/errors";
import { FeedService } from "./feed.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";

export class ModerationService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly processorService: ProcessorService,
    private readonly feedService: FeedService,
    private readonly db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ModerationService.name });
  }

  /**
   * Handles an ItemModerationEvent to approve or reject a PipelineItem.
   */
  public handleItemModerationEvent(
    event: ItemModerationEvent,
  ): Effect.Effect<CuratedItem, ModerationError> {
    return Effect.gen(this, function* (_: Effect.Adapter) {
      this.logger.info(
        { event },
        `Processing ItemModerationEvent for ${event.targetItemExternalId} in pipeline ${event.targetPipelineId}`,
      );

      const pipelineItemEffect = Effect.tryPromise({
        try: () =>
          this.submissionRepository.getSubmission(event.targetItemExternalId),
        catch: (e: unknown) =>
          new ModerationError({
            message: `Failed to fetch submission ${event.targetItemExternalId}`,
            cause: e as Error,
          }),
      });
      const richSubmission = yield* _(pipelineItemEffect);

      if (!richSubmission) {
        return yield* _(
          Effect.fail(
            new ModerationError({
              message: `Submission (PipelineItem) ${event.targetItemExternalId} not found.`,
            }),
          ),
        );
      }

      // Find the specific feed entry within the RichSubmission that matches targetPipelineId
      const submissionFeedEntry = richSubmission.feeds.find(
        (f: SelectSubmissionFeed) => f.feedId === event.targetPipelineId,
      );

      if (!submissionFeedEntry) {
        return yield* _(
          Effect.fail(
            new ModerationError({
              message: `Feed entry for pipeline ${event.targetPipelineId} not found on submission ${event.targetItemExternalId}.`,
              details: { availableFeeds: richSubmission.feeds.map((sf: SelectSubmissionFeed) => sf.feedId) }
            }),
          ),
        );
      }

      let currentPipelineItem: CuratedItem = {
        id: `${richSubmission.tweetId}-${submissionFeedEntry.feedId}`,
        feedId: submissionFeedEntry.feedId,
        originalContentExternalId: richSubmission.tweetId,
        content: richSubmission.content,
        authorUsername: richSubmission.username,
        curatorUsername: richSubmission.curatorUsername,
        curatorNotes: richSubmission.curatorNotes ?? undefined, // Handle null
        curatorTriggerEventId: richSubmission.curatorTweetId,
        status: submissionFeedEntry.status as CuratedItemStatus,
        moderation: {
          moderationTriggerEventId: submissionFeedEntry.moderationResponseTweetId || undefined,
        },
        rawSubmissionDetails: richSubmission,
        createdAt: richSubmission.submittedAt ?? undefined,
        updatedAt: submissionFeedEntry.updatedAt ?? undefined,
      };


      // Fetch FeedConfig for moderation rules
      const feedConfigEffect = Effect.tryPromise({
        try: () => this.feedService.getFeedById(event.targetPipelineId),
        catch: (e: unknown) =>
          new ModerationError({
            message: `Failed to fetch feed config for ${event.targetPipelineId}`,
            cause: e as Error,
          }),
      });
      const feed = yield* _(feedConfigEffect);

      if (!feed || !feed.config) {
        return yield* _(
          Effect.fail(
            new ModerationError({
              message: `Feed configuration for ${event.targetPipelineId} not found.`,
            }),
          ),
        );
      }
      const feedConfig = feed.config as FeedConfig;

      // Validate moderator permissions
      const moderatorHandle = event.moderatorUser.handle;
      if (!moderatorHandle) {
        return yield* _(
          Effect.fail(
            new ModerationError({
              message: "Moderator handle is missing in the event.",
            }),
          ),
        );
      }

      const approvers = feedConfig.moderation?.approvers?.twitter || [];
      if (!approvers.some((approver: string) => approver.toLowerCase() === moderatorHandle.toLowerCase())) {
        return yield* _(
          Effect.fail(
            new ModerationError({
              message: `User ${moderatorHandle} is not an authorized approver for pipeline ${event.targetPipelineId}.`,
              details: { approvers }
            }),
          ),
        );
      }

      // Check if the item is already moderated by this exact event or not pending
      if (currentPipelineItem.moderation?.moderationTriggerEventId === event.triggeringEventId) {
        this.logger.info({ event }, "Item already moderated by this exact event. Skipping.");
        return currentPipelineItem; // Idempotency: return current state
      }
      if (currentPipelineItem.status !== submissionStatusZodEnum.Enum.pending) {
        this.logger.warn(
          { event, currentStatus: currentPipelineItem.status },
          "Item is not in pending state. Skipping moderation action.",
        );
        return yield* _(Effect.fail(new ModerationError({ message: `Item not pending, current status: ${currentPipelineItem.status}` })));
      }


      // Perform the moderation action (Approve or Reject)
      const newStatus = event.action === "approve"
        ? submissionStatusZodEnum.Enum.approved
        : submissionStatusZodEnum.Enum.rejected;

      const moderationHistoryData: InsertModerationHistory = {
        adminId: moderatorHandle, // Using handle as adminId
        action: event.action,
        createdAt: event.timestamp,
        tweetId: event.targetItemExternalId, // This is the submission's tweetId
        feedId: event.targetPipelineId,
        note: event.moderationNotes || null,
      };

      // Transaction: Save moderation history & update submission feed status
      const transactionEffect = Effect.tryPromise({
        try: () =>
          this.db.transaction(async (tx: DB) => {
            await this.submissionRepository.saveModerationAction(
              moderationHistoryData,
              tx,
            );
            await this.feedRepository.updateSubmissionFeedStatus(
              event.targetItemExternalId,
              event.targetPipelineId,
              newStatus,
              event.triggeringEventId,
              tx,
            );
          }),
        catch: (e: unknown) =>
          new ModerationError({
            message: `Database transaction failed for ${event.action} action.`,
            cause: e as Error,
          }),
      });
      yield* _(transactionEffect);

      this.logger.info(
        {
          itemExternalId: event.targetItemExternalId,
          pipelineId: event.targetPipelineId,
          newStatus,
        },
        `Item status updated to ${newStatus}.`,
      );

      currentPipelineItem = {
        ...currentPipelineItem,
        status: newStatus as CuratedItemStatus,
        moderation: {
          ...currentPipelineItem.moderation,
          moderatorUsername: moderatorHandle,
          action: event.action,
          notes: event.moderationNotes,
          moderationTriggerEventId: event.triggeringEventId,
          timestamp: event.timestamp,
        },
        updatedAt: new Date(),
      };


      // If approved and stream output is enabled, process it (using existing ProcessorService)
      if (newStatus === submissionStatusZodEnum.Enum.approved && feedConfig.outputs?.stream?.enabled) {
        this.logger.info(
          { itemExternalId: event.targetItemExternalId, pipelineId: event.targetPipelineId },
          "Processing approved item for stream.",
        );
        // We need the full RichSubmission for the current ProcessorService
        const processEffect = Effect.tryPromise({
          try: () =>
            this.processorService.process(
              richSubmission,
              feedConfig.outputs!.stream!,
            ),
          catch: (e: unknown) =>
            new ModerationError({
              message: "Failed to process approved item for stream.",
              cause: e as Error,
            }),
        });
        yield* _(processEffect);
        currentPipelineItem.processedAt = new Date();
      }

      return currentPipelineItem; // Return the updated conceptual PipelineItem
    }).pipe(
      Effect.catchTags({
        ModerationError: (err: ModerationError) => {
          this.logger.error({ error: err.toJSON ? err.toJSON() : { message: err.message, cause: err.cause, details: err.details } }, err.message);
          return Effect.fail(err);
        }
      })
    );
  }
}
