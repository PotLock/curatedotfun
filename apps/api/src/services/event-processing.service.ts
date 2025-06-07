import { Context, Effect, Layer } from 'effect';
import { FeedService } from './feed.service';
import { CuratedItemManagementService } from './curated-item-management.service';
import { ModerationService } from './moderation.service';
import { RawIngestedEvent, SystemEvent, CuratedContentEvent, ItemModerationEvent, AdminCommandEvent, EventType } from '@curatedotfun/types'; 
import { RoutingError } from '../types/errors';
import { Logger } from '../utils/logger'; // Assuming Logger tag

// Interface for the EventProcessingService
export interface EventProcessingService {
  readonly processRawIngestedEvent: (
    rawEvent: RawIngestedEvent,
  ) => Effect.Effect<void, RoutingError>; // Returns void as it dispatches, or specific result if needed
  readonly processRawIngestedEvents: (
    rawEvents: RawIngestedEvent[],
  ) => Effect.Effect<void, RoutingError>;
}

// Tag for the EventProcessingService
export const EventProcessingService = Context.Tag<EventProcessingService>();

// Live implementation of the EventProcessingService
export const EventProcessingServiceLive = Layer.effect(
  EventProcessingService,
  Effect.gen(function* (_) {
    const log = yield* _(Logger);
    const feedService = yield* _(FeedService);
    const curatedItemManagementService = yield* _(CuratedItemManagementService);
    const moderationService = yield* _(ModerationService);

    // Helper to determine SystemEvent type from RawIngestedEvent
    // This is a simplified placeholder. Real logic would involve parsing content, checking metadata, etc.
    const determineSystemEventType = (
      rawEvent: RawIngestedEvent,
      // feedConfig: FeedConfig, // FeedConfig might be needed for rules
    ): Effect.Effect<SystemEvent, RoutingError> => Effect.gen(function* (_) {
      yield* _(log.debug(`Determining SystemEvent type for RawIngestedEvent: ${rawEvent.id}`));
      
      const feedIdFromSourceItem = rawEvent.rawSourceItem.feedId ?? rawEvent.rawSourceItem.pipelineId ?? 'unknown-feed'; // Example: Get feedId from rawSourceItem if available

      // Example logic using rawEvent.rawSourceItem.metadata
      if (rawEvent.rawSourceItem.metadata?.command === 'moderate') {
        const moderationDetails = rawEvent.rawSourceItem.metadata?.moderationDetails as any; // Cast for now
        if (!moderationDetails || !moderationDetails.itemId || !moderationDetails.status) {
            return yield* _(Effect.fail(new RoutingError({ message: "Missing details for ItemModerationEvent" })));
        }
        return Effect.succeed({
          _tag: EventType.ITEM_MODERATION_EVENT,
          action: moderationDetails.status, // Assuming status maps to 'approve' | 'reject'
          targetItemExternalId: moderationDetails.itemId,
          targetPipelineId: feedIdFromSourceItem, // Use feedId from rawSourceItem
          moderatorUser: { // Construct EventUser from rawEvent.author
            handle: rawEvent.author?.handle,
            platformId: rawEvent.author?.platformId,
          },
          moderationNotes: moderationDetails.reason,
          triggeringEventId: rawEvent.id, // The RawIngestedEvent's ID (SourceItem.externalId)
          timestamp: rawEvent.createdAt, // Use createdAt from RawIngestedEvent
        } as ItemModerationEvent);
      } else if (rawEvent.rawSourceItem.metadata?.command === 'adminOp') {
        const adminCommandDetails = rawEvent.rawSourceItem.metadata?.adminCommandDetails as any; // Cast for now
        return Effect.succeed({
            _tag: EventType.ADMIN_COMMAND_EVENT,
            eventId: `ace-${rawEvent.id}`,
            timestamp: rawEvent.createdAt.toISOString(),
            command: adminCommandDetails?.commandName ?? "unknownAdminCommand",
            payload: adminCommandDetails?.payload,
            executedBy: {
              handle: rawEvent.author?.handle,
              platformId: rawEvent.author?.platformId,
            },
            feedId: feedIdFromSourceItem, // Optional feedId
        } as AdminCommandEvent);
      } else {
        // Default to CuratedContentEvent
        return Effect.succeed({
          _tag: EventType.CURATED_CONTENT_EVENT,
          curatedContentExternalId: rawEvent.id, // RawIngestedEvent.id is SourceItem.externalId
          curatedContentEvent: rawEvent, // The full RawIngestedEvent
          pipelineId: feedIdFromSourceItem, // Use feedId from rawSourceItem
          itemType: "curated", // Default, could be determined by other logic
          curatorUser: { // Construct EventUser from rawEvent.author
            handle: rawEvent.author?.handle,
            platformId: rawEvent.author?.platformId,
          },
          // curatorNotes: rawEvent.rawSourceItem.metadata?.notes, // Example
          triggeringEvent: rawEvent, // The event itself is the trigger here
        } as CuratedContentEvent);
      }
    });

    const processRawIngestedEvent = (
      rawEvent: RawIngestedEvent,
    ): Effect.Effect<void, RoutingError> =>
      Effect.gen(function* (_) {
        yield* _(log.info(`Processing RawIngestedEvent: ${rawEvent.id} (SourceItem ID: ${rawEvent.sourceItemId})`));
        
        // const feedConfig = yield* _(feedService.getFeedConfigById(rawEvent.rawSourceItem.feedId)); // Access feedId via rawSourceItem
        // if (!feedConfig) {
        //   return yield* _(Effect.fail(new RoutingError({ message: `Feed config not found for feedId: ${rawEvent.rawSourceItem.feedId}` })));
        // }

        const systemEvent = yield* _(determineSystemEventType(rawEvent /*, feedConfig */));

        yield* _(log.info(`Determined SystemEvent type: ${systemEvent._tag} for eventId: ${systemEvent.eventId ?? (systemEvent as any).curatedContentExternalId}`));

        switch (systemEvent._tag) { // Use _tag for discriminated union
          case EventType.CURATED_CONTENT_EVENT:
            yield* _(log.debug(`Dispatching CuratedContentEvent ${(systemEvent as CuratedContentEvent).curatedContentExternalId} to CuratedItemManagementService`));
            return yield* _(curatedItemManagementService.handleCuratedContentEvent(systemEvent as CuratedContentEvent));
          case EventType.ITEM_MODERATION_EVENT:
            yield* _(log.debug(`Dispatching ItemModerationEvent ${(systemEvent as ItemModerationEvent).triggeringEventId} to ModerationService`));
            return yield* _(moderationService.handleItemModerationEvent(systemEvent as ItemModerationEvent));
          case EventType.ADMIN_COMMAND_EVENT:
            yield* _(log.warn(`AdminCommandEvent received: ${(systemEvent as AdminCommandEvent).eventId}. Handler not yet implemented.`));
            return Effect.void; 
          default:
            // This case should ideally be impossible if SystemEvent is correctly typed and handled
            const unhandledEvent: never = systemEvent; 
            yield* _(log.error(`Unknown SystemEvent type: ${(unhandledEvent as any)._tag}`));
            return yield* _(Effect.fail(new RoutingError({ message: `Unknown SystemEvent type: ${(unhandledEvent as any)._tag}` })));
        }
      }).pipe(Effect.catchAll(error => {
          // Log the error and then fail the effect
          return Effect.gen(function*(_) {
              yield* _(log.error(`Error processing raw event ${rawEvent.id}: ${JSON.stringify(error)}`));
              return yield* _(Effect.fail(error as RoutingError));
          });
      }));

    const processRawIngestedEvents = (
      rawEvents: RawIngestedEvent[],
    ): Effect.Effect<void, RoutingError> =>
      Effect.gen(function* (_) {
        yield* _(log.info(`Processing batch of ${rawEvents.length} RawIngestedEvents.`));
        // Process events, perhaps sequentially or in parallel with controlled concurrency
        // Using Effect.forEach for sequential processing for now.
        // For parallel: Effect.all(rawEvents.map(event => processRawIngestedEvent(event)), { concurrency: 5 })
        yield* _(Effect.forEach(rawEvents, processRawIngestedEvent, { discard: true }));
        yield* _(log.info(`Finished processing batch of ${rawEvents.length} RawIngestedEvents.`));
      }).pipe(Effect.catchAll(error => {
        return Effect.gen(function*(_) {
            yield* _(log.error(`Error processing batch of raw events: ${JSON.stringify(error)}`));
            return yield* _(Effect.fail(error as RoutingError));
        });
    }));
      
    return {
      processRawIngestedEvent,
      processRawIngestedEvents,
    };
  }),
);
