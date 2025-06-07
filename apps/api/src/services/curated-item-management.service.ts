import {
  DB,
  FeedConfig,
  FeedRepository,
  SubmissionRepository,
  submissionStatusZodEnum,
  InsertSubmission,
  InsertSubmissionFeed,
} from "@curatedotfun/shared-db";
import {
  CuratedContentEvent,
  CuratedItem,
  CuratedItemStatus,
} from "@curatedotfun/types";
import { Effect } from "effect";
import { Logger } from "pino";
import { CuratedItemError, RoutingError } from "../types/errors"; // Assuming RoutingError might be used if feed not found
import { FeedService } from "./feed.service"; // Using FeedService to get full FeedConfig

export class CuratedItemManagementService {
  public readonly logger: Logger;

  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly feedRepository: FeedRepository, // For submission_feeds table
    private readonly feedService: FeedService, // For FeedConfig
    private readonly db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({
      service: CuratedItemManagementService.name,
    });
  }

  /**
   * Handles a CuratedContentEvent to create or update a CuratedItem.
   * Determines initial status based on FeedConfig.
   * @param event The CuratedContentEvent to process.
   * @returns An Effect that yields the created/updated CuratedItem or fails with an error.
   */
  public handleCuratedContentEvent(
    event: CuratedContentEvent,
  ): Effect.Effect<CuratedItem, CuratedItemError | RoutingError> {
    return Effect.gen(this, function* (_: Effect.Adapter) {
      this.logger.info(
        { event },
        `Processing CuratedContentEvent for ${event.curatedContentExternalId} in pipeline ${event.pipelineId}`,
      );

      // 1. Fetch FeedConfig to determine moderation rules and if user is auto-approved
      const feed = yield* _(
        Effect.tryPromise({
          try: () => this.feedService.getFeedById(event.pipelineId),
          catch: (e) =>
            new RoutingError({
              message: `Failed to fetch feed config for ${event.pipelineId}`,
              cause: e as Error,
            }),
        }),
      );

      if (!feed || !feed.config) {
        return yield* _(
          Effect.fail(
            new RoutingError({
              message: `Feed configuration for pipeline ${event.pipelineId} not found.`,
            }),
          ),
        );
      }
      const feedConfig = feed.config as FeedConfig;

      // 2. Determine initial status
      let initialStatus: CuratedItemStatus =
        submissionStatusZodEnum.Enum.pending; // Default to pending

      const curatorHandle = event.curatorUser.handle;
      if (curatorHandle) {
        const approvers = feedConfig.moderation?.approvers?.twitter || []; // Assuming twitter for now
        if (
          approvers.some(
            (approver: string) =>
              approver.toLowerCase() === curatorHandle.toLowerCase(),
          )
        ) {
          // TODO: Add more sophisticated itemTypeRules check from PipelineConfig if it exists
          // For now, if curator is an approver, auto-approve.
          // Map to 'approved' for now if DB schema for submission_feeds.status doesn't have 'auto_approved'
          initialStatus = submissionStatusZodEnum.Enum.approved as CuratedItemStatus; // Treat as 'approved' for DB compatibility
          this.logger.info(
            {
              curator: curatorHandle,
              feedId: event.pipelineId,
              externalId: event.curatedContentExternalId,
            },
            "Curator is an approver. Setting initial status to auto-approved.",
          );
        }
      }

      // 3. Prepare data for submission and submission_feed tables
      // This part adapts to your existing table structure.
      // If you evolve 'submissions' to 'curated_items', this will change.
      const submissionData: InsertSubmission = {
        tweetId: event.curatedContentExternalId, // This is the original content's ID
        userId: event.curatedContentEvent.author.platformId || "unknown_platform_id",
        username: event.curatedContentEvent.author.handle || "unknown_handle",
        content: event.curatedContentEvent.content,
        curatorId: event.curatorUser.platformId || "unknown_curator_platform_id", // Default if null/undefined
        curatorUsername: event.curatorUser.handle || "unknown_curator_handle", // Default if null/undefined
        curatorTweetId: event.triggeringEvent.id, // ID of the command event
        curatorNotes: event.curatorNotes,
        submittedAt: event.triggeringEvent.createdAt, // Timestamp of the command
        createdAt: new Date(), // When this DB record is created
      };

      const submissionFeedData: InsertSubmissionFeed = {
        submissionId: event.curatedContentExternalId,
        feedId: event.pipelineId,
        status: (initialStatus === submissionStatusZodEnum.Enum.approved || initialStatus === "auto-approved" || initialStatus === "processed")
          ? submissionStatusZodEnum.Enum.approved
          : (initialStatus === submissionStatusZodEnum.Enum.rejected)
            ? submissionStatusZodEnum.Enum.rejected
            : submissionStatusZodEnum.Enum.pending, // Default for 'pending', 'failed', or other states
        // moderationResponseTweetId might be set later if moderated
      };

      // 4. Save to DB (potentially in a transaction)
      // For now, assuming SubmissionRepository handles this.
      // This logic will need to align with how you evolve your DB schema.
      // If submissions table becomes curated_items, this will be simpler.
      yield* _(
        Effect.tryPromise({
          try: async () => {
            // This is a simplified representation.
            // Ideally, saveSubmission and addSubmissionToFeed would be part of a transaction
            // and might need to be adapted if the `submissions` table is directly modified.
            // For now, we assume `saveSubmission` is idempotent or handles conflicts.
            // And a new method in FeedRepository or SubmissionRepository to link submission to feed with status.

            // Check if submission already exists
            const existingSubmission =
              await this.submissionRepository.getSubmission(
                submissionData.tweetId,
              );
            if (!existingSubmission) {
              await this.submissionRepository.saveSubmission(
                submissionData,
                this.db, // Assuming direct db access for non-transactional for now, or pass tx
              );
            } else {
              this.logger.info({tweetId: submissionData.tweetId}, "Submission already exists, skipping saveSubmission.");
              // Potentially update existing submission if needed, e.g. curator notes
            }

            // Add to feed or update status if already exists in feed
            await this.feedRepository.saveSubmissionToFeed(
              submissionFeedData,
              this.db, // Pass tx if in a transaction
            );
          },
          catch: (e) =>
            new CuratedItemError({
              message: "Failed to save CuratedItem to database.",
              cause: e as Error,
            }),
        }),
      );

      this.logger.info(
        {
          curatedItemId: `${event.curatedContentExternalId}-${event.pipelineId}`,
          initialStatus,
        },
        "CuratedItem created/updated in database.",
      );

      // 5. Construct and return the CuratedItem object
      const curatedItem: CuratedItem = {
        id: `${event.curatedContentExternalId}-${event.pipelineId}`, // Composite ID for this instance
        feedId: event.pipelineId,
        originalContentExternalId: event.curatedContentExternalId,
        content: event.curatedContentEvent.content,
        authorUsername: event.curatedContentEvent.author.handle,
        curatorUsername: event.curatorUser.handle,
        curatorNotes: event.curatorNotes,
        curatorTriggerEventId: event.triggeringEvent.id,
        status: initialStatus,
        rawSubmissionDetails: {
          // Store the raw event or parts of it if needed for transition
          submissionData,
          submissionFeedData,
        },
        createdAt: submissionData.createdAt,
        updatedAt: new Date(), // Reflects this operation
      };

      return curatedItem;
    });
  }
}
