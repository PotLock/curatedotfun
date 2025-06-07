import {
  FeedConfig,
  FeedRepository,
  LastProcessedState,
  LastProcessedStateRepository,
  PlatformState,
  SourceConfig,
  SourceSearchConfig,
  SubmissionRepository,
  type DB,
} from "@curatedotfun/shared-db";
import {
  SourceItem,
  SourcePluginSearchOptions
} from "@curatedotfun/types";
import { Cause, Duration, Effect, Exit, Schedule } from "effect";
import { Logger } from "pino";
import { SourceFetchingError } from "../types/errors";
import { CuratedItemManagementService } from "./curated-item-management.service";
import { EventRoutingService } from "./event-routing.service";
import { FeedService } from "./feed.service";
import { IngestionService } from "./ingestion.service";
import { IBackgroundTaskService } from "./interfaces/background-task.interface";
import { ModerationService } from "./moderation.service";
import { PluginService } from "./plugin.service";
import { ProcessorService } from "./processor.service";


export class SourceService implements IBackgroundTaskService {
  private pollingIntervals: NodeJS.Timeout[] = [];
  private readonly ingestionService: IngestionService;
  private readonly eventRoutingService: EventRoutingService;
  private readonly curatedItemManagementService: CuratedItemManagementService;
  private readonly moderationService: ModerationService;
  private static readonly DEFAULT_ASYNC_JOB_POLLING_INTERVAL_MS = 5000;
  private static readonly DEFAULT_MAX_ASYNC_JOB_POLLING_ATTEMPTS = 12; // 12 * 5s = 1 minute
  public readonly logger: Logger;

  constructor(
    private readonly pluginService: PluginService,
    private readonly lastProcessedStateRepository: LastProcessedStateRepository,
    private readonly db: DB,
    private readonly feedRepository: FeedRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly feedService: FeedService,
    private readonly processorService: ProcessorService,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: SourceService.name });
    this.ingestionService = new IngestionService(this.logger);
    this.eventRoutingService = new EventRoutingService(this.feedRepository, this.logger);
    this.curatedItemManagementService = new CuratedItemManagementService(
      this.submissionRepository,
      this.feedRepository,
      this.feedService,
      this.db,
      this.logger,
    );
    this.moderationService = new ModerationService(
      this.feedRepository,
      this.submissionRepository,
      this.processorService,
      this.feedService,
      this.db,
      this.logger,
    );
  }

  private fetchFromSearchConfig(
    feedId: string,
    sourcePluginName: string,
    sourcePluginInstanceConfig: Record<string, unknown> | undefined,
    searchConfig: SourceSearchConfig,
  ): Effect.Effect<SourceItem[], SourceFetchingError> {
    const { searchId, type, query, pageSize, platformArgs, ...rest } =
      searchConfig;

    this.logger.info(
      `Fetching items for feed '${feedId}', plugin '${sourcePluginName}', searchId '${searchId}' (type: ${type})`,
    );

    return Effect.gen(this, function* (_) {
      const plugin = yield* _(
        Effect.tryPromise({
          try: () =>
            this.pluginService.getPlugin<"source", SourceItem>(
              sourcePluginName,
              {
                type: "source",
                config: sourcePluginInstanceConfig || {},
              },
            ),
          catch: (e) =>
            new SourceFetchingError({
              message: `Failed to get plugin ${sourcePluginName}`,
              cause: e as Error,
              sourcePluginName,
              searchId,
            }),
        }),
      );

      const initialPluginState = (yield* _(
        Effect.tryPromise({
          try: () =>
            this.lastProcessedStateRepository.getState(
              feedId,
              sourcePluginName,
              searchId,
            ),
          catch: (e) =>
            new SourceFetchingError({
              message: `Failed to get initial plugin state for ${sourcePluginName}, searchId ${searchId}`,
              cause: e as Error,
              sourcePluginName,
              searchId,
            }),
        }),
      )) as LastProcessedState<PlatformState> | null;

      const searchOptions: SourcePluginSearchOptions = {
        type,
        query: query || "",
        pageSize,
        platformArgs,
        ...rest,
      };

      const pollingIntervalMs = SourceService.DEFAULT_ASYNC_JOB_POLLING_INTERVAL_MS;
      const maxPollingAttempts = SourceService.DEFAULT_MAX_ASYNC_JOB_POLLING_ATTEMPTS;

      let currentPluginStateRef = initialPluginState;
      let itemsToReturnRef: SourceItem[] = [];
      let pollingAttemptCount = 0;

      const singlePollStep = Effect.gen(this, function* (_) {
        pollingAttemptCount++;
        this.logger.info({ feedId, sourcePluginName, searchId, attempt: pollingAttemptCount, maxAttempts: maxPollingAttempts },
          `Polling attempt ${pollingAttemptCount}/${maxPollingAttempts} for ${searchId}`,
        );

        const searchResults = yield* _(
          Effect.tryPromise({
            try: () => plugin.search(currentPluginStateRef as LastProcessedState<PlatformState> | null, searchOptions),
            catch: (e) => new SourceFetchingError({
              message: `Plugin search failed during polling for ${sourcePluginName}, searchId ${searchId}`,
              cause: e as Error, sourcePluginName, searchId,
            }),
          }),
        );W

        itemsToReturnRef = searchResults.items;

        if (!searchResults.nextLastProcessedState) {
          this.logger.info({ feedId, sourcePluginName, searchId }, `Plugin returned no nextLastProcessedState. Assuming process complete.`);
          currentPluginStateRef = null;
          return { status: "complete" as const, items: itemsToReturnRef };
        }

        currentPluginStateRef = searchResults.nextLastProcessedState;
        const jobStatus = currentPluginStateRef.data?.currentAsyncJob?.status ?? currentPluginStateRef.data?.currentMasaJob?.status;

        if (jobStatus === "done") {
          this.logger.info({ feedId, sourcePluginName, searchId }, `Job is 'done'.`);
          return { status: "complete" as const, items: itemsToReturnRef };
        }
        if (jobStatus === "error" || jobStatus === "timeout") {
          this.logger.error({ feedId, sourcePluginName, searchId, jobStatus }, `Job status is '${jobStatus}'. Aborting poll.`);
          itemsToReturnRef = [];
          return { status: "error" as const, items: itemsToReturnRef };
        }
        if (jobStatus === "submitted" || jobStatus === "pending" || jobStatus === "processing") {
          this.logger.info({ feedId, sourcePluginName, searchId, jobStatus }, `Job status is ${jobStatus}. Will poll again.`);
          return { status: "polling" as const, items: itemsToReturnRef };
        }

        this.logger.info({ feedId, sourcePluginName, searchId }, `Job has no explicit pending/done/error status. Assuming complete.`);
        return { status: "complete" as const, items: itemsToReturnRef };
      });

      const pollingSchedule = Schedule.recurs(maxPollingAttempts - 1)
        .pipe(
          Schedule.addDelay(() => Duration.millis(pollingIntervalMs)),
          Schedule.untilInput<{ status: "complete" | "error" | "polling", items: SourceItem[] }>((result) => result.status === "complete" || result.status === "error")
        );

      const pollLoopEffect = singlePollStep.pipe(Effect.repeat(pollingSchedule));

      const finalPollOutcome = yield* _(
        pollLoopEffect.pipe(
          Effect.map((result: { status: string, items: SourceItem[] } | number) => {
            if (typeof result === 'number') {
              this.logger.warn({ feedId, sourcePluginName, searchId, attempts: result }, `Polling schedule completed due to max recursions.`);
              const lastJobStatus = currentPluginStateRef?.data?.currentAsyncJob?.status ?? currentPluginStateRef?.data?.currentMasaJob?.status;
              if (lastJobStatus === "submitted" || lastJobStatus === "pending" || lastJobStatus === "processing") {
                this.logger.warn({ feedId, sourcePluginName, searchId, lastJobStatus }, "Job still processing after max attempts (schedule ended by count), discarding items.");
                itemsToReturnRef = [];
              }
              return { status: "max_attempts_reached" as const, items: itemsToReturnRef };
            }

            if (pollingAttemptCount >= maxPollingAttempts && result.status === "polling") {
              const lastJobStatus = currentPluginStateRef?.data?.currentAsyncJob?.status ?? currentPluginStateRef?.data?.currentMasaJob?.status;
              this.logger.warn({ feedId, sourcePluginName, searchId, lastJobStatus },
                `Max polling attempts reached for ${searchId} (checked after loop). Last job status: ${lastJobStatus || "unknown"}. Discarding items if job still processing.`,
              );
              if (lastJobStatus === "submitted" || lastJobStatus === "pending" || lastJobStatus === "processing") {
                itemsToReturnRef = [];
              }
              return { status: "max_attempts_reached" as const, items: itemsToReturnRef };
            }
            return result;
          })
        )
      );

      itemsToReturnRef = finalPollOutcome.items;

      if (currentPluginStateRef) {
        yield* _(Effect.tryPromise({
          try: () => this.lastProcessedStateRepository.saveState(
            feedId,
            sourcePluginName,
            searchId,
            currentPluginStateRef!,
            this.db,
          ),
          catch: (e) => new SourceFetchingError({
            message: `Failed to save plugin state for ${sourcePluginName}, searchId ${searchId}`,
            cause: e as Error,
            sourcePluginName,
            searchId,
          }),
        }));
      } else {
        this.logger.info({ feedId, sourcePluginName, searchId },
          `Plugin resulted in a null final state. Not saving state.`,
        );
        yield* _(Effect.tryPromise({
          try: () => this.lastProcessedStateRepository.deleteState(
            feedId,
            sourcePluginName,
            searchId,
            this.db,
          ),
          catch: (e) => new SourceFetchingError({
            message: `Failed to delete plugin state for ${sourcePluginName}, searchId ${searchId}`,
            cause: e as Error,
            sourcePluginName,
            searchId,
          }),
        }));
      }

      this.logger.info({ feedId, sourcePluginName, searchId, count: itemsToReturnRef.length },
        `Fetched ${itemsToReturnRef.length} items from plugin after polling logic.`,
      );

      return itemsToReturnRef.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          sourcePlugin: sourcePluginName,
          searchType: type,
        },
      }));
    }).pipe(
      Effect.catchAll((caughtError: SourceFetchingError | Error | unknown) => { // Broaden type for safety
        let errorPayload: object;
        if (caughtError instanceof SourceFetchingError) {
          errorPayload = {
            name: caughtError._tag, // Or caughtError.name
            message: caughtError.message,
            cause: caughtError.cause, // Assuming cause is part of SourceFetchingError
            details: caughtError.details,
            sourcePluginName: caughtError.sourcePluginName,
            searchId: caughtError.searchId,
          };
        } else if (caughtError instanceof Error) {
          errorPayload = { name: caughtError.name, message: caughtError.message, stack: caughtError.stack };
        } else {
          errorPayload = { message: String(caughtError) };
        }
        this.logger.error(
          {
            error: errorPayload, // Use the structured payload
            feedId,
            sourcePluginName,
            searchId,
          },
          `Effect pipeline failed for fetchFromSearchConfig`,
        );
        if (caughtError instanceof SourceFetchingError) {
          return Effect.fail(caughtError);
        }
        return Effect.fail(new SourceFetchingError({
          message: "An unexpected error occurred in fetchFromSearchConfig",
          cause: caughtError instanceof Error ? caughtError : new Error(String(caughtError)),
          sourcePluginName,
          searchId,
        }));
      }),
    );
  }

  public fetchFromSource(
    feedId: string,
    sourceConfig: SourceConfig,
  ): Effect.Effect<SourceItem[], SourceFetchingError> {
    const {
      plugin: pluginName,
      config: pluginInstanceConfig,
      search: searchConfigs,
    } = sourceConfig;

    this.logger.info(
      { feedId, pluginName, searchConfigCount: searchConfigs.length },
      `Processing source '${pluginName}' for feed '${feedId}'`,
    );

    if (searchConfigs.length === 0) {
      return Effect.succeed([]);
    }

    return Effect.forEach(searchConfigs, (searchConfig) => {
      return this.fetchFromSearchConfig(
        feedId,
        pluginName,
        pluginInstanceConfig,
        searchConfig,
      ).pipe(
        Effect.catchTag("SourceFetchingError", (e) => {
          this.logger.error(
            { error: e, searchId: searchConfig.searchId, pluginName, feedId },
            `Skipping searchId ${searchConfig.searchId} for plugin ${pluginName} due to error. Returning empty for this search.`,
          );
          return Effect.succeed([] as SourceItem[]); // Return empty array for this failed search config
        }),
      );
    }).pipe(
      Effect.map(arraysOfItems => arraysOfItems.flat()), // Flatten the array of arrays
      Effect.tap((allItems) => this.logger.info(
        { feedId, pluginName, itemCount: allItems.length },
        `Finished processing source '${pluginName}' for feed '${feedId}'. Fetched ${allItems.length} items.`,
      ))
    );
  }

  public fetchAllSourcesForFeed(
    feedConfig: FeedConfig,
  ): Effect.Effect<SourceItem[], SourceFetchingError> {
    if (!feedConfig.sources || feedConfig.sources.length === 0) {
      this.logger.info({ feedId: feedConfig.id }, `No sources configured for feed.`);
      return Effect.succeed([]);
    }

    this.logger.info({ feedId: feedConfig.id, sourceCount: feedConfig.sources.length }, `Fetching all sources for feed.`);

    return Effect.forEach(feedConfig.sources, (sourceConfig) => {
      return this.fetchFromSource(feedConfig.id, sourceConfig).pipe(
        // If a specific source fails, log it and return empty for that source, allowing others to proceed
        Effect.catchTag("SourceFetchingError", (e) => {
          this.logger.error(
            { error: e, sourcePlugin: sourceConfig.plugin, feedId: feedConfig.id },
            `Skipping source plugin ${sourceConfig.plugin} for feed ${feedConfig.id} due to error. Returning empty for this source.`,
          );
          return Effect.succeed([] as SourceItem[]);
        }),
      );
    }).pipe(
      Effect.map(arraysOfItems => arraysOfItems.flat()), // Flatten the array of arrays from each source
      Effect.tap((allItems) => this.logger.info(
        { feedId: feedConfig.id, totalItemCount: allItems.length },
        `Total items fetched for feed '${feedConfig.id}': ${allItems.length}`,
      ))
    );
  }

  async shutdown(): Promise<void> {
    this.logger.info(
      "SourceService shutdown initiated. Relies on PluginService for plugin cleanup.",
    );
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals = [];
  }

  private async processInboundItems(items: SourceItem[], feedConfig: FeedConfig): Promise<void> {
    this.logger.info({ itemCount: items.length, feedId: feedConfig.id }, "Processing inbound items.");

    for (const item of items) {
      const processingEffect = this.ingestionService.processSourceItem(item).pipe(
        Effect.flatMap(rawEvent => this.eventRoutingService.routeEvent(rawEvent)),
        Effect.flatMap(systemEvent => {
          this.logger.info({ systemEvent, feedId: feedConfig.id }, "SystemEvent routed via SourceService");
          if (systemEvent._tag === "CuratedContentEvent") {
            // Ensure pipelineId in event matches current feedConfig.id if necessary, or trust event's pipelineId
            if (systemEvent.pipelineId !== feedConfig.id) {
              this.logger.warn({ eventPipelineId: systemEvent.pipelineId, feedConfigId: feedConfig.id, itemId: item.id }, "CuratedContentEvent pipelineId does not match current feedConfig id. Using event's pipelineId.");
            }
            return this.curatedItemManagementService.handleCuratedContentEvent(systemEvent).pipe(
              Effect.tap(curatedItem => this.logger.info({ curatedItemId: curatedItem.id, feedId: feedConfig.id }, "CuratedItem processed for CuratedContentEvent"))
            );
          } else if (systemEvent._tag === "ItemModerationEvent") {
            if (systemEvent.targetPipelineId !== feedConfig.id) {
              this.logger.warn({ eventTargetPipelineId: systemEvent.targetPipelineId, feedConfigId: feedConfig.id, itemId: item.id }, "ItemModerationEvent targetPipelineId does not match current feedConfig id. Using event's targetPipelineId.");
            }
            return this.moderationService.handleItemModerationEvent(systemEvent).pipe(
              Effect.tap(curatedItem => this.logger.info({ curatedItemId: curatedItem.id, feedId: feedConfig.id }, "CuratedItem processed for ItemModerationEvent"))
            );
          }
          this.logger.info({ systemEventTag: systemEvent._tag, feedId: feedConfig.id }, "Unhandled SystemEvent type in SourceService processInboundItems");
          return Effect.void;
        }),
        Effect.catchAll(error => {
          const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) };
          if ('details' in error && error.details) { // For our tagged errors
            Object.assign(errorDetails, error.details);
          }
          this.logger.error({ error: errorDetails, itemId: item.id, feedId: feedConfig.id }, "Error processing item through Effect pipeline in SourceService");
          return Effect.void;
        })
      );

      // Consider Effect.runFork for concurrent processing of items if appropriate
      // For now, sequential processing with await for simplicity and to see logs in order
      await Effect.runPromiseExit(processingEffect);
    }
  }

  public async start(): Promise<void> {
    this.logger.info(
      "SourceService: Starting background polling for all feeds.",
    );
    const allDbFeeds = await this.feedRepository.getAllFeeds();

    if (!allDbFeeds || allDbFeeds.length === 0) {
      this.logger.warn("SourceService: No feeds found in database to poll.");
      return;
    }

    const feedsToPoll = allDbFeeds.filter(
      (dbFeed) => dbFeed.config && dbFeed.config.enabled,
    );

    if (feedsToPoll.length === 0) {
      this.logger.warn(
        "SourceService: No enabled feeds with valid configurations found to poll.",
      );
      return;
    }

    for (const dbFeed of feedsToPoll) {
      const feedConfig = dbFeed.config as FeedConfig;
      const pollingIntervalMs = feedConfig.pollingIntervalMs || 5 * 60 * 1000;

      this.logger.info(
        `SourceService: Setting up polling for feed '${feedConfig.id}' every ${pollingIntervalMs / 1000} seconds.`,
      );

      let intervalId: NodeJS.Timeout | null = null;

      const pollFeed = async () => {
        try {
          const currentDbFeed = await this.feedRepository.getFeedById(feedConfig.id);
          if (!currentDbFeed?.config?.enabled) {
            this.logger.info(`SourceService: Feed '${feedConfig.id}' no longer enabled or found. Stopping poll.`);
            if (intervalId) {
              clearInterval(intervalId);
              this.pollingIntervals = this.pollingIntervals.filter(id => id !== intervalId);
            }
            return;
          }
          const currentFeedConfig = currentDbFeed.config as FeedConfig;
          this.logger.info(`SourceService: Polling feed '${currentFeedConfig.id}'...`);

          const fetchEffect = this.fetchAllSourcesForFeed(currentFeedConfig);
          const exitValue = await Effect.runPromiseExit(fetchEffect); // Renamed to exitValue to avoid conflict with imported Exit

          if (Exit.isSuccess(exitValue)) {
            const sourceItems = exitValue.value; // Access value from Success
            if (sourceItems.length > 0) {
              await this.processInboundItems(sourceItems, currentFeedConfig);
            } else {
              this.logger.info(`SourceService: No new items for feed '${currentFeedConfig.id}'.`);
            }
          } else {
            // Handle failure of fetchAllSourcesForFeed
            this.logger.error(
              { error: Cause.pretty(exitValue.cause), feedId: currentFeedConfig.id }, // Access cause from Failure
              `Failed to fetch sources for feed '${currentFeedConfig.id}'.`
            );
          }
        } catch (error) {
          this.logger.error({ error, feedId: feedConfig.id }, `SourceService: Error polling feed '${feedConfig.id}'.`);
        }
      };

      intervalId = setInterval(pollFeed, pollingIntervalMs);
      this.pollingIntervals.push(intervalId);
      pollFeed();
    }
  }

  public async stop(): Promise<void> {
    this.logger.info(
      "SourceService: Stopping background polling for all feeds.",
    );
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals = [];
    await this.shutdown();
    this.logger.info("SourceService: All polling stopped.");
  }
}
