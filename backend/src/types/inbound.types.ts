import { FeedConfig, SelectModerationHistory, SourceItem, Submission } from "@curatedotfun/types";

// --- New Types for Architectural Refactor ---

/**
 * Standardized representation of a SourceItem after initial adaptation.
 * This is the output of the revised AdapterService.
 */
export interface AdaptedSourceItem {
  sourceInternalId: string; // From SourceItem.id
  externalId?: string; // From SourceItem.externalId
  content: string; // From SourceItem.content
  createdAt: Date; // From SourceItem.createdAt (ensured as Date)
  author?: {
    id?: string;
    username?: string;
    displayName?: string;
    // Potentially other common author fields from SourceItem.author
  };
  media?: SourceItem["media"]; // Use SourceItem's media type directly or define a standardized one
  metadata: {
    sourcePlugin: string; // Name of the plugin that sourced this item
    searchId: string; // ID of the search configuration that sourced this item
    feedId: string; // ID of the feed this item was found in (context)
    inReplyToId?: string; // From SourceItem.metadata.inReplyToId, if present
    // Include other original metadata fields as well
    [key: string]: any; // To capture other original SourceItem.metadata fields
  };
  originalSourceItem: SourceItem; // Keep the original for reference and further processing
}

// --- Intent Types for InterpretationService Output ---

export type InterpretedIntentType =
  | "pendingSubmissionCommandIntent"
  | "directSubmissionIntent"
  | "contentItemIntent"
  | "moderationCommandIntent"
  | "unknownIntent";

export interface BaseIntent {
  type: InterpretedIntentType;
  /** The AdaptedSourceItem that was interpreted to form this intent. */
  adaptedSourceItem: AdaptedSourceItem;
  /** The configuration of the feed in which the source item was found. */
  feedConfig: FeedConfig;
}

/**
 * Intent for a '!submit' command that is a reply to another item.
 * The target item needs to be fetched and processed.
 */
export interface PendingSubmissionCommandIntent extends BaseIntent {
  type: "pendingSubmissionCommandIntent";
  targetExternalId: string; // External ID of the content to be submitted (from inReplyToId)
  curatorId: string; // From adaptedSourceItem.author.id or a default
  curatorUsername: string; // From adaptedSourceItem.author.username or a default
  curatorPlatformId?: string; // Platform-specific ID of the curator
  curatorActionExternalId: string; // externalId of the command item itself
  curatorNotes?: string; // Extracted notes from the command content
  submittedAt: Date; // createdAt of the command item
  potentialTargetFeedNames?: string[]; // Extracted hashtag texts from command for feed routing
}

/**
 * Intent for a '!submit' command where the command item itself is the content.
 */
export interface DirectSubmissionIntent extends BaseIntent {
  type: "directSubmissionIntent";
  /** Data extracted and formed to create a new Submission. */
  submissionData: Partial<Submission>; // Includes content, author, curator info, notes, etc.
}

/**
 * Intent for a source item that is direct content, not a command.
 */
export interface ContentItemIntent extends BaseIntent {
  type: "contentItemIntent";
  /** Data extracted and formed to create a new Submission. */
  submissionData: Partial<Submission>; // Includes content, author info. Curator might be system/default.
}

/**
 * Intent for a moderation command like '!approve' or '!reject'.
 */
export interface ModerationCommandIntent extends BaseIntent {
  type: "moderationCommandIntent";
  /** Data required to perform a moderation action. */
  commandData: ModerationCommandData; // Re-uses existing ModerationCommandData structure
  // Populated from adaptedSourceItem and extracted notes.
}

/**
 * Intent for items that could not be interpreted or resulted in an error.
 */
export interface UnknownIntent extends BaseIntent {
  type: "unknownIntent";
  error?: string; // Optional error message
}

/**
 * Discriminated union for all possible outputs of the InterpretationService.
 */
export type InterpretedIntent =
  | PendingSubmissionCommandIntent
  | DirectSubmissionIntent
  | ContentItemIntent
  | ModerationCommandIntent
  | UnknownIntent;

// ModerationCommandData is kept as it is used by ModerationCommandIntent.
// Other legacy "AdaptedItem" types that were previously here have been removed
// as their functionality is superseded by AdaptedSourceItem and the InterpretedIntent union.
export interface ModerationCommandData {
  // Information to identify the target submission
  targetExternalId: string; // e.g., the Tweet ID of the content being moderated
  targetSourcePluginName?: string; // Optional: if moderation can target content from specific sources

  // Moderation details
  action: SelectModerationHistory["action"]; // "approve" | "reject"
  moderatorUsername: string; // Username of the moderator
  moderatorPlatformId?: string; // Platform-specific ID of the moderator (e.g., Twitter user ID)
  notes?: string; // Notes from the moderator
  commandExternalId: string; // External ID of the command itself (e.g., the moderator's reply tweet ID)
  commandTimestamp: Date;
}
