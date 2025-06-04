import { DB, FeedRepository, SubmissionRepository } from "@curatedotfun/shared-db";
import { Logger } from "pino";
import { AppConfig } from "../types/config";
import { 
  Submission, 
  SubmissionFeed, 
  SubmissionStatusEnum as SubmissionStatus 
} from "@curatedotfun/types"; // Updated import path
import { ProcessorService } from "./processor.service";
import { IBaseService } from "./interfaces/base-service.interface";

export class ModerationService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly processorService: ProcessorService,
    private readonly config: AppConfig, // For feed output stream config
    private readonly db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ModerationService.name });
  }

  async approveSubmission(
    submission: Submission,
    feed: SubmissionFeed, // The specific feed entry for the submission
    moderationTweetId: string, // ID of the tweet that triggered approval (admin's tweet or curator's auto-approve tweet)
    // moderatorPlatformUserId: string, // We'll use adminId from submission for now as per user direction
    // note?: string | null, // Notes can be part of the Moderation object saved before calling this
  ): Promise<void> {
    const feedConfig = this.config.feeds.find(
      (f) => f.id.toLowerCase() === feed.feedId.toLowerCase(),
    );

    if (!feedConfig) {
      this.logger.error(
        { submissionId: submission.tweetId, feedId: feed.feedId },
        "Feed configuration not found for approval.",
      );
      return;
    }

    // Note: Saving ModerationHistory record should happen before calling this,
    // or be passed in to be saved here within the transaction.
    // For now, assuming it's saved by the caller (SubmissionService)

    try {
      await this.db.transaction(async (tx) => {
        // Update status in submissionFeeds table
        await this.feedRepository.updateSubmissionFeedStatus(
          submission.tweetId,
          feed.feedId,
          SubmissionStatus.APPROVED,
          moderationTweetId,
          tx,
        );

        this.logger.info(
          { submissionId: submission.tweetId, feedId: feed.feedId },
          "Submission status updated to APPROVED.",
        );

        // If stream output is enabled for this feed, process it
        if (feedConfig.outputs.stream?.enabled) {
          this.logger.info(
            { submissionId: submission.tweetId, feedId: feed.feedId },
            "Processing approved submission for stream.",
          );
          await this.processorService.process(
            submission, // Requires the full submission object
            feedConfig.outputs.stream,
            // tx, // ProcessorService might need transaction
          );
        }
      });
    } catch (error) {
      this.logger.error(
        {
          error,
          submissionId: submission.tweetId,
          feedId: feed.feedId,
        },
        "Failed to process approved submission in ModerationService.",
      );
      // Re-throw to allow caller to handle, or handle more gracefully here
      throw error;
    }
  }

  async rejectSubmission(
    submission: Submission,
    feed: SubmissionFeed, // The specific feed entry for the submission
    moderationTweetId: string, // ID of the tweet that triggered rejection
    // moderatorPlatformUserId: string,
    // note?: string | null,
  ): Promise<void> {
    // Note: Saving ModerationHistory record should happen before calling this.

    try {
      await this.db.transaction(async (tx) => {
        await this.feedRepository.updateSubmissionFeedStatus(
          submission.tweetId,
          feed.feedId,
          SubmissionStatus.REJECTED,
          moderationTweetId,
          tx,
        );
        this.logger.info(
          { submissionId: submission.tweetId, feedId: feed.feedId },
          "Submission status updated to REJECTED.",
        );
      });
    } catch (error) {
      this.logger.error(
        {
          error,
          submissionId: submission.tweetId,
          feedId: feed.feedId,
        },
        "Failed to process rejected submission in ModerationService.",
      );
      throw error;
    }
  }
}
