import { FeedRepository } from "@curatedotfun/shared-db";
import {
  CuratedContentEvent,
  EventUser,
  ItemModerationEvent,
  RawIngestedEvent,
  SystemEvent,
} from "@curatedotfun/types";
import { Effect } from "effect";
import { Logger } from "pino";
import { RoutingError } from "../types/errors";
// Assuming FeedService might be used later, for now FeedRepository for direct config access
// import { FeedService } from "./feed.service";

export class EventRoutingService {
  public readonly logger: Logger;

  constructor(
    // private readonly feedService: FeedService, // Or FeedRepository
    private readonly feedRepository: FeedRepository,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: EventRoutingService.name });
  }

  /**
   * Routes a RawIngestedEvent to a specific SystemEvent.
   * This is a simplified example; real-world routing would involve more complex parsing
   * of event.content or event.rawSourceItem to determine commands and parameters.
   * @param event The RawIngestedEvent to route.
   * @returns An Effect that yields a SystemEvent or fails with a RoutingError.
   */
  public routeEvent(
    event: RawIngestedEvent,
  ): Effect.Effect<SystemEvent, RoutingError> {
    return Effect.try({
      try: () => {
        this.logger.info(
          { rawEventId: event.id },
          "Routing RawIngestedEvent",
        );

        const content = event.content.toLowerCase();
        const author: EventUser = {
          handle: event.author.handle,
          platformId: event.author.platformId,
        };

        // Example: "!curate #feedId some notes"
        if (content.startsWith("!curate")) {
          const parts = event.content.split(" "); // Simple split, needs robust parsing
          const feedIdTag = parts.find((p) => p.startsWith("#"));
          if (!feedIdTag) {
            throw new Error(
              "Curate command found, but no feedId (e.g., #myfeed) specified.",
            );
          }
          const feedId = feedIdTag.substring(1);
          const notes = parts.slice(parts.indexOf(feedIdTag) + 1).join(" ");

          const curatedContentEvent: CuratedContentEvent = {
            _tag: "CuratedContentEvent",
            curatedContentExternalId: event.id, // The ID of the content being curated
            curatedContentEvent: event, // The event that IS the content
            pipelineId: feedId, // Should be feedId
            itemType: "curated", // Defaulting to 'curated'
            curatorUser: author,
            curatorNotes: notes || undefined,
            triggeringEvent: event, // The event that triggered the curation (the command itself)
          };
          this.logger.info(
            { eventId: event.id, feedId },
            "Routed to CuratedContentEvent",
          );
          return curatedContentEvent as SystemEvent; // Cast needed as SystemEvent is a union
        }
        // Example: "!approve <targetItemId> #feedId some notes"
        else if (content.startsWith("!approve") || content.startsWith("!reject")) {
          const action = content.startsWith("!approve") ? "approve" : "reject";
          const parts = event.content.split(" "); // Simple split
          const targetItemExternalId = parts[1]; // Needs validation
          const feedIdTag = parts.find((p) => p.startsWith("#"));

          if (!targetItemExternalId) {
            throw new Error(
              `${action} command found, but no targetItemExternalId specified.`,
            );
          }
          if (!feedIdTag) {
            throw new Error(
              `${action} command found, but no feedId (e.g., #myfeed) specified.`,
            );
          }
          const feedId = feedIdTag.substring(1);
          const notes = parts.slice(parts.indexOf(feedIdTag) + 1).join(" ");

          const itemModerationEvent: ItemModerationEvent = {
            _tag: "ItemModerationEvent",
            action: action,
            targetItemExternalId: targetItemExternalId,
            targetPipelineId: feedId, // Should be feedId
            moderatorUser: author,
            moderationNotes: notes || undefined,
            triggeringEventId: event.id, // The ID of the command tweet/post
            timestamp: event.createdAt,
          };
          this.logger.info(
            { eventId: event.id, target: targetItemExternalId, feedId, action },
            "Routed to ItemModerationEvent",
          );
          return itemModerationEvent as SystemEvent; // Cast needed
        }

        // If no specific command is found, it's an unhandled event type for now.
        this.logger.warn(
          { rawEventId: event.id, contentPreview: content.substring(0, 50) },
          "RawIngestedEvent did not match any known routing rules.",
        );
        throw new Error(
          "Unhandled event content: No known command found.",
        );
      },
      catch: (unknownError) => {
        const error =
          unknownError instanceof Error
            ? unknownError
            : new Error(String(unknownError));
        this.logger.error(
          { error: error.message, rawEventId: event.id, stack: error.stack },
          "Failed to route RawIngestedEvent",
        );
        return new RoutingError({
          message: `Failed to route RawIngestedEvent (id: ${event.id}): ${error.message}`,
          cause: error,
          details: { rawEventId: event.id },
        });
      },
    });
  }
}
