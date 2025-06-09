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
} from "@curatedotfun/shared-db";
import { Logger } from "pino";
import { FeedService } from "./feed.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";

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
    private readonly db: DB,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: ModerationService.name });
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

    // Prevent re-moderating if not pending (optional, based on desired logic)
    // if (feedEntry.status !== submissionStatusZodEnum.Enum.pending) {
    //   this.logger.warn({ submissionId: payload.submissionId, feedId: payload.feedId, currentStatus: feedEntry.status }, "Submission feed entry is not pending, skipping moderation.");
    //   // Potentially throw an error or return a specific status
    //   return;
    // }

    const moderationActionData: InsertModerationHistory = {
      tweetId: payload.submissionId,
      feedId: payload.feedId,
      adminId: payload.adminId,
      action: payload.action,
      note: payload.note || null,
      createdAt: payload.timestamp || new Date(),
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
