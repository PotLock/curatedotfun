import {
  FeedRepository,
  InsertFeed,
  RichSubmission,
  submissionStatusZodEnum,
  UpdateFeed,
  type DB,
} from "@curatedotfun/shared-db";
import {
  DistributorConfig,
  FeedConfig,
  StreamConfig,
} from "@curatedotfun/types";
import { Logger } from "pino";
import { ForbiddenError, NotFoundError } from "@curatedotfun/utils";
import { isSuperAdmin } from "../utils/auth.utils";
import { IBaseService } from "./interfaces/base-service.interface";
import { ProcessorService } from "./processor.service";
import { merge } from "lodash";

export type FeedAction = "update" | "delete" | "manage_admins";

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

    const feed = await this.feedRepository.findFeedById(feedId);
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

  async createFeed(feedConfig: FeedConfig, accountId: string) {
    const dbData: InsertFeed = {
      id: feedConfig.id,
      name: feedConfig.name,
      description: feedConfig.description,
      created_by: accountId,
      config: feedConfig,
    };

    return this.db.transaction(async (tx) => {
      return this.feedRepository.createFeed(dbData, tx);
    });
  }

  async getFeedById(feedId: string) {
    const feed = await this.feedRepository.findFeedById(feedId);
    if (!feed) {
      throw new NotFoundError("Feed", feedId);
    }
    return feed;
  }

  async updateFeed(
    feedId: string,
    data: Partial<FeedConfig>,
    accountId: string,
  ) {
    const hasPermission = await this.hasPermission(accountId, feedId, "update");
    if (!hasPermission) {
      throw new ForbiddenError(
        "You do not have permission to update this feed.",
      );
    }

    // Fetch the existing feed to merge the config
    const existingFeed = await this.getFeedById(feedId);
    const existingConfig = existingFeed.config as FeedConfig;

    const newConfig: FeedConfig = merge({}, existingConfig, data);

    const dbData: UpdateFeed = {
      name: newConfig.name,
      description: newConfig.description,
      config: newConfig,
      admins: newConfig.admins as string[],
    };

    return this.db.transaction(async (tx) => {
      const updatedFeed = await this.feedRepository.updateFeed(
        feedId,
        dbData,
        tx,
      );
      if (!updatedFeed) {
        throw new NotFoundError("Feed", feedId);
      }
      return updatedFeed;
    });
  }

  async deleteFeed(feedId: string, accountId: string) {
    const hasPermission = await this.hasPermission(accountId, feedId, "delete");
    if (!hasPermission) {
      throw new ForbiddenError(
        "You do not have permission to delete this feed.",
      );
    }

    return this.db.transaction(async (tx) => {
      const deletedFeed = await this.feedRepository.deleteFeed(feedId, tx);
      if (!deletedFeed) {
        throw new NotFoundError("Feed", feedId);
      }
      return deletedFeed;
    });
  }

  // This is a core method
  // In order to process a feed, you must be the feed owner
  // this will be called by trigger/
  async processFeed(feedId: string, distributorsParam?: string) {
    const feed = await this.feedRepository.findFeedById(feedId);
    if (!feed) {
      this.logger.error(
        { feedId },
        "FeedService: processFeed - Feed not found",
      );
      throw new NotFoundError("Feed", feedId);
    }

    const feedConfig = await this.feedRepository.getFeedConfig(feedId);
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
            streamConfig.distribute?.map((d: DistributorConfig) => d.plugin) ||
            [];
          const validDistributors = requestedDistributors.filter((d) =>
            availableDistributors.includes(d),
          );
          const invalidDistributors = requestedDistributors.filter(
            (d) => !availableDistributors.includes(d),
          );

          if (invalidDistributors.length > 0) {
            this.logger.warn(
              { feedId, invalidDistributors, availableDistributors },
              `Invalid distributor(s) specified for feed ${
                feedId
              }: ${invalidDistributors.join(
                ", ",
              )}. Available: ${availableDistributors.join(", ")}`,
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
              `Processing submission ${
                submission.tweetId
              } for feed ${feedId} with selected distributors: ${validDistributors.join(
                ", ",
              )}`,
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
