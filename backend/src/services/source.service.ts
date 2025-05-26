import {
  LastProcessedState,
  PlatformState,
  SourceItem,
  SourcePluginSearchOptions,
} from "@curatedotfun/types";
import {
  FeedConfig,
  SourceConfig,
  SourceSearchConfig,
} from "../types/config.zod";
import { logger } from "../utils/logger";
import { FeedRepository } from "./db/repositories/feed.repository";
import { LastProcessedStateRepository } from "./db/repositories/lastProcessedState.repository";
import { DB } from "./db/types";
import { InboundService } from "./inbound.service";
import { IBackgroundTaskService } from "./interfaces/background-task.interface";
import { PluginService } from "./plugin.service";

export class SourceService implements IBackgroundTaskService {
  private pollingIntervals: NodeJS.Timeout[] = [];
  private static readonly DEFAULT_ASYNC_JOB_POLLING_INTERVAL_MS = 5000;
  private static readonly DEFAULT_MAX_ASYNC_JOB_POLLING_ATTEMPTS = 12; // 12 * 5s = 1 minute

  constructor(
    private pluginService: PluginService,
    private lastProcessedStateRepository: LastProcessedStateRepository,
    private inboundService: InboundService,
    private db: DB,
    private feedRepository: FeedRepository,
  ) {}

  /**
   * Fetches items for a single search configuration within a source.
   * Manages the LastProcessedState for that specific search.
   */
  private async fetchFromSearchConfig(
    feedId: string,
    sourcePluginName: string,
    sourcePluginInstanceConfig: Record<string, unknown> | undefined,
    searchConfig: SourceSearchConfig,
  ): Promise<SourceItem[]> {
    const { searchId, type, query, pageSize, platformArgs, ...rest } =
      searchConfig;

    logger.info(
      `Fetching items for feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}' (type: ${type})`,
    );

    try {
      const plugin = await this.pluginService.getPlugin<"source", SourceItem>(
        sourcePluginName,
        {
          type: "source",
          config: sourcePluginInstanceConfig || {},
        },
      );

      const initialPluginState =
        await this.lastProcessedStateRepository.getState(
          feedId,
          sourcePluginName,
          searchId,
        );

      const searchOptions: SourcePluginSearchOptions = {
        type,
        query: query || "",
        pageSize,
        platformArgs,
        ...rest,
      };

      let currentPluginState = initialPluginState;
      let itemsToReturn: SourceItem[] = [];
      let pollingAttempts = 0;

      // TODO: Consider making polling interval and max attempts configurable per plugin/search
      const pollingIntervalMs =
        SourceService.DEFAULT_ASYNC_JOB_POLLING_INTERVAL_MS;
      const maxPollingAttempts =
        SourceService.DEFAULT_MAX_ASYNC_JOB_POLLING_ATTEMPTS;

      while (pollingAttempts < maxPollingAttempts) {
        const results = await plugin.search(
          currentPluginState as LastProcessedState<PlatformState> | null,
          searchOptions,
        );

        itemsToReturn = results.items; // Assume items are valid unless job status indicates otherwise

        if (!results.nextLastProcessedState) {
          logger.info(
            `Plugin ${sourcePluginName} (searchId: ${searchId}, feed: ${feedId}) returned no nextLastProcessedState. Assuming process complete.`,
          );
          currentPluginState = null;
          break;
        }

        currentPluginState = results.nextLastProcessedState;

        const jobStatus =
          currentPluginState.data?.currentAsyncJob?.status ??
          currentPluginState.data?.currentMasaJob?.status;

        if (
          jobStatus === "submitted" ||
          jobStatus === "pending" ||
          jobStatus === "processing"
        ) {
          logger.info(
            `Feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}': Job status is ${jobStatus}. Polling again in ${pollingIntervalMs / 1000}s (Attempt ${pollingAttempts + 1}/${maxPollingAttempts}).`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, pollingIntervalMs),
          );
          pollingAttempts++;
        } else if (jobStatus === "done") {
          logger.info(
            `Feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}': Job status is 'done'.`,
          );
          break;
        } else if (jobStatus === "error" || jobStatus === "timeout") {
          logger.error(
            `Feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}': Job status is '${jobStatus}'. Aborting poll.`,
          );
          itemsToReturn = []; // Discard items on job error/timeout
          break;
        } else {
          logger.info(
            `Feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}': No active async job status found or job completed without explicit 'done' status. Proceeding.`,
          );
          break;
        }
      }

      if (pollingAttempts >= maxPollingAttempts) {
        const lastJobStatus =
          currentPluginState?.data?.currentAsyncJob?.status ??
          currentPluginState?.data?.currentMasaJob?.status;
        logger.warn(
          `Feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}': Max polling attempts (${maxPollingAttempts}) reached. Last job status: ${lastJobStatus || "unknown"}.`,
        );
        if (
          lastJobStatus === "submitted" ||
          lastJobStatus === "pending" ||
          lastJobStatus === "processing"
        ) {
          itemsToReturn = []; // Don't return items if job is still processing at max attempts
        }
      }

      if (currentPluginState) {
        await this.lastProcessedStateRepository.saveState(
          feedId,
          sourcePluginName,
          searchId,
          currentPluginState,
          this.db,
        );
      } else {
        logger.info(
          `Plugin ${sourcePluginName} (searchId: ${searchId}, feed: ${feedId}) resulted in a null final state. Not saving state.`,
        );
        await this.lastProcessedStateRepository.deleteState(
          feedId,
          sourcePluginName,
          searchId,
          this.db
        );
      }

      logger.info(
        `Fetched ${itemsToReturn.length} items from plugin '${sourcePluginName}', searchId '${searchId}' for feed '${feedId}' after polling logic.`,
      );

      return itemsToReturn.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          sourcePlugin: sourcePluginName,
          searchType: type,
        },
      }));
    } catch (error) {
      logger.error(
        `Error during plugin execution or polling for ${sourcePluginName} (searchId: ${searchId}) for feed ${feedId}:`,
        error,
      );
      // Depending on desired error handling, could rethrow, return empty, or return partials if supported
      return [];
    }
  }

  /**
   * Fetches items for all search configurations within a single source plugin for a given feed.
   */
  public async fetchFromSource(
    feedId: string,
    sourceConfig: SourceConfig,
  ): Promise<SourceItem[]> {
    const {
      plugin: pluginName,
      config: pluginInstanceConfig,
      search: searchConfigs,
    } = sourceConfig;
    let allItems: SourceItem[] = [];

    logger.info(
      `Processing source '${pluginName}' for feed '${feedId}' with ${searchConfigs.length} search configuration(s).`,
    );

    for (const searchConfig of searchConfigs) {
      try {
        const items = await this.fetchFromSearchConfig(
          feedId,
          pluginName,
          pluginInstanceConfig,
          searchConfig,
        );
        allItems = allItems.concat(items);
      } catch (error) {
        logger.error(
          `Skipping searchId ${searchConfig.searchId} for plugin ${pluginName} due to error.`,
        );
      }
    }
    return allItems;
  }

  /**
   * Fetches items from all configured sources for a given feed.
   * This is likely the main entry point to be called by the InboundService or Scheduler.
   */
  public async fetchAllSourcesForFeed(
    feedConfig: FeedConfig,
  ): Promise<SourceItem[]> {
    if (!feedConfig.sources || feedConfig.sources.length === 0) {
      logger.info(`No sources configured for feed '${feedConfig.id}'.`);
      return [];
    }

    let allItemsFromFeed: SourceItem[] = [];
    logger.info(`Fetching all sources for feed '${feedConfig.id}'.`);

    for (const sourceConfig of feedConfig.sources) {
      try {
        const items = await this.fetchFromSource(feedConfig.id, sourceConfig);
        allItemsFromFeed = allItemsFromFeed.concat(items);
      } catch (error) {
        // Logged in fetchFromSource, continue with other sources
        logger.error(
          `Skipping source plugin ${sourceConfig.plugin} for feed ${feedConfig.id} due to error.`,
        );
      }
    }

    logger.info(
      `Total items fetched for feed '${feedConfig.id}': ${allItemsFromFeed.length}`,
    );
    return allItemsFromFeed;
  }

  async shutdown(): Promise<void> {
    logger.info(
      "SourceService shutdown initiated. Relies on PluginService for plugin cleanup.",
    );
    // This existing shutdown can be part of the stop() logic if needed,
    // or stop() can focus on clearing intervals.
    // For now, let pluginService handle its own plugin cleanup.
  }

  public async start(): Promise<void> {
    logger.info("SourceService: Starting background polling for all feeds.");
    const allDbFeeds = await this.feedRepository.getAllFeeds();

    if (!allDbFeeds || allDbFeeds.length === 0) {
      logger.warn("SourceService: No feeds found in database to poll.");
      return;
    }

    const feedsToPoll = allDbFeeds.filter(
      (dbFeed) => dbFeed.config && dbFeed.config.enabled,
    );

    if (feedsToPoll.length === 0) {
      logger.warn(
        "SourceService: No enabled feeds with valid configurations found to poll.",
      );
      return;
    }

    for (const dbFeed of feedsToPoll) {
      const feedConfig = dbFeed.config as FeedConfig;

      // Use a default polling interval if not specified, e.g., 5 minutes
      // TODO: Make polling interval configurable per feed in FeedConfig
      const pollingIntervalMs = feedConfig.pollingIntervalMs || 5 * 60 * 1000; // Default to 5 minutes

      logger.info(
        `SourceService: Setting up polling for feed '${feedConfig.id}' every ${pollingIntervalMs / 1000} seconds.`,
      );

      const pollFeed = async () => {
        try {
          // Fetch the latest feed config before polling, in case it changed
          const currentDbFeed = await this.feedRepository.getFeedById(
            feedConfig.id,
          );
          if (
            !currentDbFeed ||
            !currentDbFeed.config ||
            !currentDbFeed.config.enabled
          ) {
            logger.info(
              `SourceService: Feed '${feedConfig.id}' is no longer enabled or found. Stopping poll for this feed.`,
            );
            // Find and clear this specific interval if we stored them with IDs
            // For now, this will just stop future executions of *this* pollFeed instance
            return;
          }
          const currentFeedConfig = currentDbFeed.config as FeedConfig;

          logger.info(
            `SourceService: Polling feed '${currentFeedConfig.id}'...`,
          );
          const sourceItems =
            await this.fetchAllSourcesForFeed(currentFeedConfig);
          if (sourceItems.length > 0) {
            await this.inboundService.processInboundItems(
              sourceItems,
              currentFeedConfig,
            );
          } else {
            logger.info(
              `SourceService: No new items fetched for feed '${currentFeedConfig.id}'.`,
            );
          }
        } catch (error) {
          logger.error(
            `SourceService: Error polling feed '${feedConfig.id}':`,
            error,
          );
        }
      };

      // Initial poll immediately
      pollFeed();
      // Then set up interval
      const intervalId = setInterval(pollFeed, pollingIntervalMs);
      this.pollingIntervals.push(intervalId);
    }
  }

  public async stop(): Promise<void> {
    logger.info("SourceService: Stopping background polling for all feeds.");
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals = [];
    await this.shutdown();
    logger.info("SourceService: All polling stopped.");
  }
}
