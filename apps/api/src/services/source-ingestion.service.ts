import { Context, Data, Effect, Layer, Schedule } from 'effect';
import { DB, db } from '../db';
import { FeedService } from './feed.service';
import { PluginService } from './plugin.service';
import { EventProcessingService } from './event-processing.service'; 
import { 
  LastProcessedStateRepository, 
  // LastProcessedState type from shared-db might be the DB model. 
  // The plugin uses its own LastProcessedState interface.
  // We'll assume lastProcessedStateRepository.findOrCreate returns an object with a `state` field (jsonb).
} from '@curatedotfun/shared-db'; 
import { 
  SourceItem, 
  SourceType, 
  RawIngestedEvent, 
  FeedConfig as Feed, // Use FeedConfig as Feed
  LastProcessedState as PluginLastProcessedState, // Plugin's LastProcessedState
  SourcePluginSearchOptions,
  PlatformState, // Base for TPlatformState in SourcePlugin
} from '@curatedotfun/types';
import { SourceFetchingError, IngestionError } from '../types/errors';
import type { Logger } from "pino";
import { logger as appLogger } from '../utils/logger';

// Interface for the SourceIngestionService
export interface SourceIngestionService {
  readonly pollSingleSourceAndIngest: (
    feedId: string,
    sourceType: SourceType,
    searchConfigId: string,
  ) => Effect.Effect<RawIngestedEvent[], SourceFetchingError | IngestionError>;
  readonly pollAndIngestAllSourcesForFeed: (
    feedId: string,
  ) => Effect.Effect<RawIngestedEvent[], SourceFetchingError | IngestionError>;
  readonly pollAndIngestAllSourcesContinuously: () => Effect.Effect<void, SourceFetchingError | IngestionError>;
}

// Tag for the SourceIngestionService
export const SourceIngestionService = Context.Tag<SourceIngestionService>();

// Live implementation of the SourceIngestionService
export const SourceIngestionServiceLive = Layer.effect(
  SourceIngestionService,
  Effect.gen(function* (_) {
    const log = yield* _(Logger); // Using Logger Tag
    const database = yield* _(DB); // Using DB Tag
    const pluginService = yield* _(PluginService);
    const lastProcessedStateRepository = yield* _(LastProcessedStateRepository);
    const feedService = yield* _(FeedService);
    const eventProcessingService = yield* _(EventProcessingService);

    const mapSourceItemToRawIngestedEvent = (
      sourceItem: SourceItem,
      // feedId: string, // feedId is part of SourceItem.metadata or can be passed if needed elsewhere
      // sourceType: SourceType, // sourceType (plugin name) is in sourceItem.metadata.sourcePlugin
    ): Effect.Effect<RawIngestedEvent, IngestionError> =>
      Effect.try({
        try: () => {
          // Ensure createdAt is a Date object
          let createdAtDate: Date;
          if (sourceItem.createdAt) {
            createdAtDate = new Date(sourceItem.createdAt);
            if (isNaN(createdAtDate.getTime())) {
              // Handle invalid date string if necessary, or default
              appLogger.warn(`Invalid date string for sourceItem.createdAt: ${sourceItem.createdAt}. Defaulting to now.`);
              createdAtDate = new Date();
            }
          } else {
            createdAtDate = new Date();
          }

          return {
            id: sourceItem.externalId, // Use externalId for RawIngestedEvent.id
            sourceItemId: sourceItem.id, // Internal ID from SourceItem
            sourcePluginName: sourceItem.metadata?.sourcePlugin ?? 'unknown-plugin',
            content: sourceItem.content,
            author: {
              handle: sourceItem.author?.username,
              platformId: sourceItem.author?.id,
              displayName: sourceItem.author?.displayName,
            },
            createdAt: createdAtDate,
            rawSourceItem: sourceItem, // Include the full original SourceItem
          };
        },
        catch: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          appLogger.error(`Failed to map SourceItem (id: ${sourceItem.id}, externalId: ${sourceItem.externalId}) to RawIngestedEvent: ${message}`);
          return new IngestionError({ message: `Mapping failed for ${sourceItem.externalId}: ${message}`, cause: error });
        }
      });

    const pollSingleSourceAndIngest = (
      feedId: string,
      sourceType: SourceType,
      searchConfigId: string,
    ): Effect.Effect<RawIngestedEvent[], SourceFetchingError | IngestionError> =>
      Effect.gen(function* (_) {
        yield* _(log.info(`Polling and ingesting single source for feed ${feedId}, type ${sourceType}, config ${searchConfigId}`));
        
        const feedConfig = yield* _(feedService.getFeedConfigById(feedId));
        if (!feedConfig) {
          return yield* _(Effect.fail(new SourceFetchingError({ message: `Feed config not found for feedId: ${feedId}` })));
        }

        // Find the source configuration using s.plugin
        const sourceConfig = feedConfig.sources?.find(s => s.plugin === sourceType);
        if (!sourceConfig) {
          return yield* _(Effect.fail(new SourceFetchingError({ message: `Source config not found for plugin type ${sourceType} in feed ${feedId}` })));
        }
        
        // Find the specific search configuration
        const searchConfigForPlugin = sourceConfig.search?.find(sc => sc.searchId === searchConfigId);
        if (!searchConfigForPlugin) {
          return yield* _(Effect.fail(new SourceFetchingError({ message: `Search config not found for id ${searchConfigId}` })));
        }

        const plugin = yield* _(pluginService.getPluginForSourceType(sourceType));
        if (!plugin) {
          return yield* _(Effect.fail(new SourceFetchingError({ message: `Plugin not found for source type: ${sourceType}` })));
        }

        // Fetch the last processed state entry from the database
        const dbLastStateEntry = yield* _(
          Effect.tryPromise({
            try: () => lastProcessedStateRepository.findOrCreate(feedId, searchConfigId, sourceType),
            catch: (error) => new SourceFetchingError({ message: `Failed to get last processed state: ${error}` }),
          })
        );
        
        // Adapt the DB state to the PluginLastProcessedState format
        const pluginLastState: PluginLastProcessedState<PlatformState> | null = 
          dbLastStateEntry?.state ? { data: dbLastStateEntry.state as PlatformState } : null;

        // Call plugin.search with adapted state and searchConfigForPlugin as options
        const searchResults = yield* _(
          Effect.tryPromise({
            try: () => plugin.search(pluginLastState, searchConfigForPlugin as SourcePluginSearchOptions),
            catch: (error) => new SourceFetchingError({ message: `Plugin search failed: ${error instanceof Error ? error.message : String(error)}`, cause: error }),
          })
        );
        
        const sourceItems = searchResults.items;

        if (sourceItems.length > 0) {
          // Update last processed state in the database using searchResults.nextLastProcessedState
          if (searchResults.nextLastProcessedState?.data) {
            yield* _(
              Effect.tryPromise({
                try: () => lastProcessedStateRepository.updateState(
                  dbLastStateEntry.id, // Use the ID from the fetched/created DB entry
                  searchResults.nextLastProcessedState.data // Pass the data part of the plugin's next state
                ),
                catch: (error) => new SourceFetchingError({ message: `Failed to update last processed state: ${error}` }),
              })
            );
            yield* _(log.info(`Fetched ${sourceItems.length} items for ${searchConfigId}. Updated last processed state.`));
          } else {
            yield* _(log.info(`Fetched ${sourceItems.length} items for ${searchConfigId}, but no next state provided by plugin.`));
          }
          
          const rawIngestedEventsEffects = sourceItems.map(item => 
            mapSourceItemToRawIngestedEvent(item)
          );
          const rawIngestedEvents = yield* _(Effect.all(rawIngestedEventsEffects));
          
          return rawIngestedEvents;

        } else {
          yield* _(log.info(`No new items found for ${searchConfigId}.`));
          return [];
        }
      }).pipe(Effect.catchAll(error => Effect.fail(error as SourceFetchingError | IngestionError))); // Ensure error type

    const pollAndIngestAllSourcesForFeed = (
      feedId: string,
    ): Effect.Effect<RawIngestedEvent[], SourceFetchingError | IngestionError> =>
      Effect.gen(function* (_) {
        yield* _(log.info(`Polling and ingesting all sources for feed ${feedId}`));
        const feedConfig = yield* _(feedService.getFeedConfigById(feedId));
        if (!feedConfig) {
          return yield* _(Effect.fail(new SourceFetchingError({ message: `Feed config not found for feedId: ${feedId}` })));
        }

        let allRawIngestedEvents: RawIngestedEvent[] = [];
        // Ensure feedConfig.sources exists before iterating
        const sources = feedConfig.sources ?? [];
        for (const source of sources) {
          // Ensure source.search exists before iterating
          const searchConfigs = source.search ?? [];
          for (const searchCfg of searchConfigs) {
            // Pass source.plugin as sourceType, and searchCfg.searchId
            const events = yield* _(pollSingleSourceAndIngest(feedId, source.plugin, searchCfg.searchId));
            allRawIngestedEvents = allRawIngestedEvents.concat(events);
          }
        }
        yield* _(log.info(`Finished polling & ingesting for feed ${feedId}. Total events: ${allRawIngestedEvents.length}`));
        return allRawIngestedEvents;
      });

    const pollAndIngestAllSourcesContinuously = (): Effect.Effect<void, SourceFetchingError | IngestionError> =>
      Effect.gen(function* (_) {
        yield* _(log.info('Starting continuous polling and ingestion for all sources...'));
        const allFeeds = yield* _(feedService.getAllFeedConfigs());

        const processFeedAndPassToEventProcessing = (feed: Feed) => // Assuming Feed type from @curatedotfun/types
          Effect.gen(function* (_) {
            const rawEvents = yield* _(pollAndIngestAllSourcesForFeed(feed.id));
            if (rawEvents.length > 0) {
              yield* _(log.info(`Passing ${rawEvents.length} raw events from feed ${feed.id} to EventProcessingService.`));
              // Pass events to EventProcessingService
              // This assumes EventProcessingService has a method like handleRawIngestedEvents
              yield* _(eventProcessingService.processRawIngestedEvents(rawEvents)); 
            }
          }).pipe(
            Effect.catchAll((error) => 
              log.error(`Error polling or ingesting for feed ${feed.id}: ${JSON.stringify(error)}`)
            )
          );
        
        const pollingLoop = Effect.forEach(allFeeds, (feed) => processFeedAndPassToEventProcessing(feed), {
          concurrency: 'inherit', 
        }).pipe(
          Effect.flatMap(() => Effect.sleep(Data.Duration.decode('60 seconds'))), 
          Effect.forever,
        );
        
        yield* _(pollingLoop);
      }).pipe(Effect.catchAll(error => Effect.fail(error as SourceFetchingError | IngestionError)));
      
    return {
      pollSingleSourceAndIngest,
      pollAndIngestAllSourcesForFeed,
      pollAndIngestAllSourcesContinuously,
    };
  }),
);
