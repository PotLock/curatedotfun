import {
  SourceItem,
  SourcePlugin,
  LastProcessedState,
  PlatformState,
  SourcePluginSearchOptions,
} from "@curatedotfun/types";
import {
  FeedConfig,
  SourceConfig,
  SourceSearchConfig,
} from "../types/config.zod";
import { PluginService } from "./plugin.service";
import { logger } from "../utils/logger";
import { LastProcessedStateRepository } from "./db/repositories/lastProcessedState.repository";

export class SourceService {
  constructor(
    private pluginService: PluginService,
    private lastProcessedStateRepository: LastProcessedStateRepository, // Placeholder
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
          config: sourcePluginInstanceConfig || {}, // Plugin instance config
        },
      );

      const lastState = await this.lastProcessedStateRepository.getState(
        feedId,
        sourcePluginName,
        searchId,
      );

      const searchOptions: SourcePluginSearchOptions = {
        type,
        query: query || "", // Ensure query is a string
        pageSize,
        platformArgs,
        ...rest, // Pass through any other dynamic properties from searchConfig
      };

      // Type assertion for lastState if necessary, assuming repository returns compatible type
      const results = await plugin.search(
        lastState as LastProcessedState<PlatformState> | null,
        searchOptions,
      );

      if (results.nextLastProcessedState) {
        await this.lastProcessedStateRepository.saveState(
          feedId,
          sourcePluginName,
          searchId,
          results.nextLastProcessedState,
        );
      } else {
        // If plugin returns null for nextLastProcessedState, it might mean the source is exhausted
        // or state is not relevant for this search. We might want to clear existing state.
        logger.info(
          `Plugin ${sourcePluginName} (searchId: ${searchId}) returned no nextLastProcessedState.`,
        );
        // Optionally, clear the state:
        // await this.lastProcessedStateRepository.clearState(feedId, sourcePluginName, searchId);
      }

      logger.info(
        `Fetched ${results.items.length} items from plugin '${sourcePluginName}', searchId '${searchId}'.`,
      );
      return results.items.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          sourcePlugin: sourcePluginName,
          searchType: type,
        },
      }));
    } catch (error) {
      logger.error(
        `Error fetching from plugin ${sourcePluginName} (searchId: ${searchId}) for feed ${feedId}:`,
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
        // Logged in fetchFromSearchConfig, continue with other search configs
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
    // SourceService itself might not need specific shutdown logic beyond what PluginService handles,
    // unless it manages its own resources (e.g., direct connections, intervals).
    // PluginService.cleanup() will handle shutting down individual plugins.
    logger.info(
      "SourceService shutdown initiated. Relies on PluginService for plugin cleanup.",
    );
  }
}
