import { RawIngestedEvent, SourceItem } from "@curatedotfun/types";
import { Effect } from "effect";
import { Logger } from "pino";
import { IngestionError } from "../types/errors";

export class IngestionService {
  public readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ service: IngestionService.name });
  }

  /**
   * Transforms a SourceItem into a RawIngestedEvent.
   * @param item The SourceItem to process.
   * @returns An Effect that yields a RawIngestedEvent or fails with an IngestionError.
   */
  public processSourceItem(
    item: SourceItem,
  ): Effect.Effect<RawIngestedEvent, IngestionError> {
    return Effect.try({
      try: () => {
        this.logger.info(
          { sourceItemId: item.id, externalId: item.externalId },
          "Processing SourceItem into RawIngestedEvent",
        );

        if (!item.externalId) {
          throw new Error(
            "SourceItem is missing externalId, which is required for RawIngestedEvent.id",
          );
        }
        if (!item.metadata?.sourcePlugin) {
          throw new Error(
            "SourceItem is missing metadata.sourcePlugin, which is required for RawIngestedEvent.sourcePluginName",
          );
        }

        // Basic content extraction - this might need to be more sophisticated
        // depending on the actual structure of SourceItem.content
        let processedContent: string;
        if (typeof item.content === "string") {
          processedContent = item.content;
        } else if (
          typeof item.content === 'object' &&
          item.content !== null &&
          'text' in item.content &&
          typeof (item.content as any).text === 'string'
        ) {
          processedContent = (item.content as any).text;
        } else {
          processedContent = ""; // Default to empty string if content is not in expected format
          this.logger.warn({ sourceItemId: item.id }, "SourceItem content is not a string or an object with a text property. Defaulting to empty content for RawIngestedEvent.");
        }

        const rawIngestedEvent: RawIngestedEvent = {
          id: item.externalId,
          sourceItemId: item.id,
          sourcePluginName: item.metadata.sourcePlugin,
          content: processedContent,
          author: {
            handle: item.author?.username,
            platformId: item.author?.id,
            displayName: item.author?.displayName || item.author?.name,
          },
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          rawSourceItem: item,
        };
        this.logger.info(
          { rawEventId: rawIngestedEvent.id },
          "Successfully transformed SourceItem to RawIngestedEvent",
        );
        return rawIngestedEvent;
      },
      catch: (unknownError) => {
        const error =
          unknownError instanceof Error
            ? unknownError
            : new Error(String(unknownError));
        this.logger.error(
          { error: error.message, sourceItemId: item.id, stack: error.stack },
          "Failed to process SourceItem into RawIngestedEvent",
        );
        return new IngestionError({
          message: `Failed to transform SourceItem (id: ${item.id}) to RawIngestedEvent: ${error.message}`,
          cause: error,
          details: { sourceItemId: item.id },
        });
      },
    });
  }
}
