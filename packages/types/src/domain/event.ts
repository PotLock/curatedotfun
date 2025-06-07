import { CuratedItem } from "./pipeline";
import { SourceItem as CanonicalSourceItem } from "../plugin";

/**
 * Represents a user who initiated an event (curator, moderator, admin).
 */
export interface EventUser {
  /** Platform-specific handle or username (e.g., Twitter handle). */
  handle?: string;
  /** Platform-specific user ID. */
  platformId?: string;
  // Potentially other generic user identifiers
}

/**
 * Event representing a manual moderation action on a content item.
 */
export interface ItemModerationEvent {
  readonly _tag: "ItemModerationEvent";
  /** The action to perform: approve or reject. */
  readonly action: "approve" | "reject";
  /** The external ID of the content item being moderated (e.g., original tweet ID). */
  readonly targetItemExternalId: string;
  /** The ID of the pipeline/feed this moderation applies to. */
  readonly targetPipelineId: string;
  /** The user who performed the moderation. */
  readonly moderatorUser: EventUser;
  /** Optional notes provided by the moderator. */
  readonly moderationNotes?: string;
  /**
   * The external ID of the event that triggered this moderation
   * (e.g., the ID of the moderator's '!approve' tweet).
   */
  readonly triggeringEventId: string;
  /** Timestamp of when the moderation command was issued. */
  readonly timestamp: Date;
}

/**
 * Enum for System Event types
 */
export const EventType = {
  ITEM_MODERATION_EVENT: "ItemModerationEvent",
  CURATED_CONTENT_EVENT: "CuratedContentEvent",
  ADMIN_COMMAND_EVENT: "AdminCommandEvent",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Event representing an administrative command.
 */
export interface AdminCommandEvent {
  readonly _tag: "AdminCommandEvent";
  readonly eventId: string;
  readonly timestamp: string; // ISO Date string
  readonly command: string; // e.g., "resyncFeed", "updateUserRole"
  readonly payload?: Record<string, any>; // Command-specific arguments
  readonly executedBy?: EventUser; // User who executed the command
  readonly feedId?: string; // Optional: if command is specific to a feed
}

/**
 * Represents a recognized action or event that the system needs to act upon.
 * This is a discriminated union.
 */
export type SystemEvent = ItemModerationEvent | CuratedContentEvent | AdminCommandEvent;

// --- Supporting types that might be used by other events later ---

/**
 * Canonical, platform-agnostic representation of an event ingested from any source.
 */
export interface RawIngestedEvent {
  id: string; // Unique ID for this specific event/content from its source (e.g., SourceItem.externalId)
  sourceItemId: string; // Internal ID from the source plugin (SourceItem.id)
  sourcePluginName: string; // Name of the source plugin
  content: string;
  author: {
    handle?: string;
    platformId?: string;
    displayName?: string;
  };
  createdAt: Date;
  // ... other fields as per full spec
  rawSourceItem: CanonicalSourceItem; // The full original SourceItem
}

/**
 * Event representing new content being curated into a pipeline.
 */
export interface CuratedContentEvent {
  readonly _tag: "CuratedContentEvent";
  readonly curatedContentExternalId: string;
  readonly curatedContentEvent: RawIngestedEvent; // The full RawIngestedEvent for the curated content
  readonly pipelineId: string;
  readonly itemType: "curated" | "recap"; // Or other types
  readonly curatorUser: EventUser;
  readonly curatorNotes?: string;
  readonly triggeringEvent: RawIngestedEvent;
}
