import {
  DistributorConfig,
  FeedRepository,
  InsertFeed,
  StreamConfig,
  submissionStatusZodEnum,
  UpdateFeed,
  type DB,
} from "@curatedotfun/shared-db";
import { Logger } from "pino";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";

export class FeedService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private feedRepository: FeedRepository,
    private processorService: ProcessorService,
    private db: DB,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async getAllFeeds() {
    this.logger.info("FeedService: getAllFeeds called");
    return this.feedRepository.getAllFeeds();
  }

  async createFeed(data: InsertFeed) {
    this.logger.info({ feedData: data }, "FeedService: createFeed called");
    return this.db.transaction(async (tx) => {
      return this.feedRepository.createFeed(data, tx);
    });
  }

  async getFeedById(feedId: string) {
    this.logger.info({ feedId }, "FeedService: getFeedById called");
    return this.feedRepository.getFeedById(feedId);
  }

  async updateFeed(feedId: string, data: UpdateFeed) {
    this.logger.info(
      { feedId, updateData: data },
      "FeedService: updateFeed called",
    );
    return this.db.transaction(async (tx) => {
      return this.feedRepository.updateFeed(feedId, data, tx);
    });
  }

  async deleteFeed(feedId: string) {
    this.logger.info({ feedId }, "FeedService: deleteFeed called");
    return this.db.transaction(async (tx) => {
      const result = await this.feedRepository.deleteFeed(feedId, tx);
      if (result === 0) {
        this.logger.warn(
          { feedId },
          "FeedService: deleteFeed - Feed not found or not deleted",
        );
        return 0;
      }
      return result;
    });
  }

  // This is a core method
  // In order to process a feed, you must be the feed owner
  // this will be called by trigger/
  async processFeed(feedId: string, distributorsParam?: string) {
    this.logger.info(
      { feedId, distributorsParam },
      "FeedService: processFeed called",
    );

    const feed = await this.feedRepository.getFeedById(feedId);
    if (!feed) {
      this.logger.error(
        { feedId },
        "FeedService: processFeed - Feed not found",
      );
      throw new Error(`Feed not found: ${feedId}`); // Or a custom NotFoundError
    }

    const feedConfig = await this.feedRepository.getFeedConfig(feedId); // Get config from DB
    if (!feedConfig) {
      this.logger.error(
        { feedId },
        "FeedService: processFeed - Feed configuration not found in database",
      );
      throw new Error(`Feed configuration not found for feedId: ${feedId}`);
    }

    const submissions = await this.feedRepository.getSubmissionsByFeed(feedId);
    const approvedSubmissions = submissions.filter(
      (sub) => sub.status === submissionStatusZodEnum.Enum.approved,
    );

    if (approvedSubmissions.length === 0) {
      this.logger.info(
        { feedId },
        "FeedService: processFeed - No approved submissions to process.",
      );
      return { processed: 0, distributors: [] };
    }

    let processedCount = 0;
    const usedDistributors = new Set<string>();

    for (const submission of approvedSubmissions) {
      try {
        if (
          !feedConfig.outputs?.stream?.distribute ||
          feedConfig.outputs.stream.distribute.length === 0
        ) {
          this.logger.info(
            { submissionId: submission.tweetId, feedId },
            "FeedService: processFeed - No stream output or no distributors configured for this feed.",
          );
          continue;
        }

        const streamConfig: StreamConfig = { ...feedConfig.outputs.stream };

        if (!distributorsParam) {
          streamConfig.distribute?.forEach((d: DistributorConfig) =>
            usedDistributors.add(d.plugin),
          );
        } else {
          const requestedDistributors = distributorsParam
            .split(",")
            .map((d) => d.trim());
          const availableDistributors =
            streamConfig.distribute?.map((d) => d.plugin) || [];
          const validDistributors = requestedDistributors.filter((d) =>
            availableDistributors.includes(d),
          );
          const invalidDistributors = requestedDistributors.filter(
            (d) => !availableDistributors.includes(d),
          );

          if (invalidDistributors.length > 0) {
            this.logger.warn(
              { feedId, invalidDistributors, availableDistributors },
              `Invalid distributor(s) specified for feed ${feedId}: ${invalidDistributors.join(", ")}. Available: ${availableDistributors.join(", ")}`,
            );
          }

          if (validDistributors.length === 0) {
            this.logger.warn(
              { feedId, requestedDistributors },
              `No valid distributors specified for feed ${feedId}. Skipping distribution for submission ${submission.tweetId}.`,
            );
            continue;
          } else {
            streamConfig.distribute = streamConfig.distribute?.filter(
              (d: DistributorConfig) => validDistributors.includes(d.plugin),
            );
            validDistributors.forEach((d) => usedDistributors.add(d));
            this.logger.info(
              { submissionId: submission.tweetId, feedId, validDistributors },
              `Processing submission ${submission.tweetId} for feed ${feedId} with selected distributors: ${validDistributors.join(", ")}`,
            );
          }
        }

        // Ensure submission has all necessary fields for processorService.process
        // The submission from getSubmissionsByFeed might be a partial type.
        // If processorService needs the full Submission object, we might need to fetch it individually.
        // For now, assuming the structure is compatible.
        await this.processorService.process(submission, streamConfig);
        processedCount++;
      } catch (error) {
        this.logger.error(
          { error, submissionId: submission.tweetId, feedId },
          `Error processing submission ${submission.tweetId} for feed ${feedId}`,
        );
        // Decide if one error should stop all processing or just skip this one
      }
    }

    return {
      processed: processedCount,
      distributors: Array.from(usedDistributors),
    };
  }
}
