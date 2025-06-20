import {
  DistributorConfig,
  FeedRepository,
  InsertFeed,
  RichSubmission,
  StreamConfig,
  submissionStatusZodEnum,
  UpdateFeed,
  type DB,
} from "@curatedotfun/shared-db";
import { Logger } from "pino";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";
import { isSuperAdmin } from "../utils/auth.utils";

export type FeedAction =
  | "update" // For general updates to feed config, name, description
  | "delete"
  | "manage_admins"; // For adding/removing users from the feed's admin list

export class FeedService implements IBaseService {
  public readonly logger: Logger;
  private superAdminAccounts: string[];

  constructor(
    private feedRepository: FeedRepository,
    private processorService: ProcessorService,
    private db: DB,
    logger: Logger,
    superAdminAccounts: string[],
  ) {
    this.logger = logger;
    this.superAdminAccounts = superAdminAccounts;
  }

  private _isCurrentUserSuperAdmin(accountId: string | null): boolean {
    return isSuperAdmin(accountId, this.superAdminAccounts);
  }

  public async hasPermission(
    accountId: string | null,
    feedId: string,
    action: FeedAction,
  ): Promise<boolean> {
    if (!accountId) {
      return false;
    }

    if (this._isCurrentUserSuperAdmin(accountId)) {
      return true;
    }

    const feed = await this.feedRepository.getFeedById(feedId);
    if (!feed) {
      this.logger.warn(
        { accountId, feedId, action },
        "hasPermission check: Feed not found.",
      );
      return false;
    }

    const isCreator = accountId === feed.created_by;
    const feedAdmins = (feed.admins as string[] | null) || [];
    const isAdminOnFeed = feedAdmins.includes(accountId);

    switch (action) {
      case "update":
        return isCreator || isAdminOnFeed;
      case "delete":
        return isCreator;
      case "manage_admins":
        return isCreator || isAdminOnFeed;
      default:
        this.logger.warn(
          { accountId, feedId, action },
          "Unknown feed action for permission check",
        );
        return false;
    }
  }

  async getAllFeeds() {
    return this.feedRepository.getAllFeeds();
  }

  async createFeed(data: InsertFeed) {
    return this.db.transaction(async (tx) => {
      return this.feedRepository.createFeed(data, tx);
    });
  }

  async getFeedById(feedId: string) {
    return this.feedRepository.getFeedById(feedId);
  }

  async updateFeed(feedId: string, data: UpdateFeed) {
    return this.db.transaction(async (tx) => {
      return this.feedRepository.updateFeed(feedId, data, tx);
    });
  }

  async deleteFeed(feedId: string) {
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

    const approvedSubmissions: RichSubmission[] =
      await this.feedRepository.getAllSubmissionsByFeed(
        feedId,
        submissionStatusZodEnum.Enum.approved,
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
