import type { SourceItem } from "@curatedotfun/types";
import { Logger } from "pino";
import { FeedConfig } from "../types/config.zod";
import { AdaptedSourceItem } from "../types/inbound.types";
import { IBaseService } from "./interfaces/base-service.interface";

// TODO: This could probably be removed
export class AdapterService implements IBaseService {
  public readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Adapts a raw SourceItem into a structured AdaptedSourceItem.
   * This service now focuses on pure structural transformation and basic data type coercion.
   * Command detection and interpretation are moved to a new InterpretationService.
   *
   * @param sourceItem The raw item from the SourcePlugin.
   * @param feedConfig The configuration of the feed this item belongs to.
   * @param searchId The ID of the search configuration that sourced this item.
   * @returns An AdaptedSourceItem.
   */
  public adaptItem(
    sourceItem: SourceItem,
    feedConfig: FeedConfig, // Retained as it's part of the context, might be useful for some adaptations
    searchId: string,
  ): AdaptedSourceItem {
    const {
      id: sourceInternalId,
      externalId,
      content,
      createdAt,
      author,
      media,
      metadata: originalItemMetadata, // Renamed to avoid conflict
    } = sourceItem;

    // Ensure createdAt is a Date object
    const ensuredCreatedAt = createdAt ? new Date(createdAt) : new Date();

    // Construct the metadata for AdaptedSourceItem
    // Start with essential context, then spread original metadata
    const adaptedMetadata: AdaptedSourceItem["metadata"] = {
      ...(originalItemMetadata || {}), // Spread original metadata first
      sourcePlugin: originalItemMetadata?.sourcePlugin || "unknown", // Ensure sourcePlugin is present
      searchId: searchId,
      feedId: feedConfig.id,
      // Explicitly map inReplyToId if it exists in original metadata
      inReplyToId: originalItemMetadata?.inReplyToId,
    };

    const adaptedSourceItem: AdaptedSourceItem = {
      sourceInternalId,
      externalId: externalId || undefined, // Ensure undefined if null/empty
      content: content || "", // Ensure content is a string, even if empty
      createdAt: ensuredCreatedAt,
      author: author
        ? {
            id: author.id,
            username: author.username,
            displayName: author.displayName,
            // Potentially map other common author fields here
          }
        : undefined,
      media: media || undefined, // Pass through media
      metadata: adaptedMetadata,
      originalSourceItem: sourceItem,
    };

    return adaptedSourceItem;
  }

  // All private methods (tryAdaptAsSubmissionCommand, tryAdaptAsModerationCommand,
  // tryAdaptAsContent, extractCuratorNotes) are removed as their logic
  // will be handled by the new InterpretationService.
}
