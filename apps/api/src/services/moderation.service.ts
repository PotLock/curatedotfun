import {
  DB,
  FeedRepository,
  InsertModerationHistory,
  RichSubmission,
  SelectSubmissionFeed,
  SubmissionRepository,
  submissionStatusZodEnum,
} from "@curatedotfun/shared-db";
import { Logger } from "pino";
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

  public async processApprovalDecision(
    submission: RichSubmission,
    feedEntry: SelectSubmissionFeed,
    adminUsername: string,
    moderationTriggerTweetId: string, // The tweet ID of the !approve command
    note: string | null,
    timestamp: Date,
  ): Promise<void> {
    const moderationActionData: InsertModerationHistory = {
      adminId: adminUsername,
      action: "approve",
      createdAt: timestamp,
      tweetId: submission.tweetId, // This is the submission's tweetId
      feedId: feedEntry.feedId,
      note,
      moderationTweetId: moderationTriggerTweetId,
    };

    return this.db.transaction(async (tx) => {
      await this.submissionRepository.saveModerationAction(
        moderationActionData,
        tx,
      );
      await this.approveSubmission(
        submission,
        feedEntry,
        moderationTriggerTweetId, // This is the tweet ID of the moderation action itself
        tx,
      );
    });
  }

  public async processRejectionDecision(
    submission: RichSubmission,
    feedEntry: SelectSubmissionFeed,
    adminUsername: string,
    moderationTriggerTweetId: string, // The tweet ID of the !reject command
    note: string | null,
    timestamp: Date,
  ): Promise<void> {
    const moderationActionData: InsertModerationHistory = {
      adminId: adminUsername,
      action: "reject",
      createdAt: timestamp,
      tweetId: submission.tweetId, // This is the submission's tweetId
      feedId: feedEntry.feedId,
      note,
      moderationTweetId: moderationTriggerTweetId,
    };

    return this.db.transaction(async (tx) => {
      await this.submissionRepository.saveModerationAction(
        moderationActionData,
        tx,
      );
      await this.rejectSubmission(
        submission,
        feedEntry,
        moderationTriggerTweetId,
        tx,
      );
    });
  }

  async approveSubmission(
    submission: RichSubmission,
    feed: SelectSubmissionFeed,
    moderationTweetId: string,
    tx: DB,
  ): Promise<void> {
    const feedFromDb = await this.feedService.getFeedById(feed.feedId);
    if (!feedFromDb || !feedFromDb.config) {
      this.logger.error(
        { submissionId: submission.tweetId, feedId: feed.feedId },
        "Feed or feed configuration not found for approval.",
      );
      // Decide if to throw to rollback transaction or just return
      throw new Error(`Feed configuration not found for feed ${feed.feedId}`);
    }
    const feedConfig = feedFromDb.config;

    try {
      await this.feedRepository.updateSubmissionFeedStatus(
        submission.tweetId,
        feed.feedId,
        submissionStatusZodEnum.Enum.approved,
        moderationTweetId,
        tx,
      );

      this.logger.info(
        { submissionId: submission.tweetId, feedId: feed.feedId },
        "Submission status updated to APPROVED.",
      );

      // If stream output is enabled for this feed, process it
      if (feedConfig.outputs?.stream?.enabled) {
        this.logger.info(
          { submissionId: submission.tweetId, feedId: feed.feedId },
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
          feedId: feed.feedId,
        },
        "Failed to process approved submission in ModerationService.",
      );
      throw error;
    }
  }

  async rejectSubmission(
    submission: RichSubmission,
    feed: SelectSubmissionFeed,
    moderationTweetId: string,
    tx: DB,
  ): Promise<void> {
    try {
      await this.feedRepository.updateSubmissionFeedStatus(
        submission.tweetId,
        feed.feedId,
        submissionStatusZodEnum.Enum.rejected,
        moderationTweetId,
        tx,
      );
      this.logger.info(
        { submissionId: submission.tweetId, feedId: feed.feedId },
        "Submission status updated to REJECTED.",
      );
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
