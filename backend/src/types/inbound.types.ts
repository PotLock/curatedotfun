import { SourceItem } from "@curatedotfun/types";
import { Submission, Moderation, SubmissionStatus } from "./submission"; // Added SubmissionStatus

// Discriminated union for different types of adapted items
export type AdaptedItemType =
  | "contentSubmission"
  | "moderationCommand"
  | "pendingSubmissionCommand"
  | "unknown";

// Base interface for any item processed by the InboundService
export interface BaseAdaptedItem {
  type: AdaptedItemType;
  originalSourceItem: SourceItem; // The raw item from the SourcePlugin
  sourcePluginName: string; // Name of the plugin that sourced this item
  feedId: string; // ID of the feed this item belongs to
  searchId: string; // ID of the search configuration that sourced this item
}

// Specific type for an adapted content submission
export interface AdaptedContentSubmission extends BaseAdaptedItem {
  type: "contentSubmission";
  submission: Submission; // The structured Submission object
}

// Specific type for an adapted moderation command
// This will carry the necessary data for SubmissionService to process a moderation action
export interface ModerationCommandData {
  // Information to identify the target submission
  targetExternalId: string; // e.g., the Tweet ID of the content being moderated
  targetSourcePluginName?: string; // Optional: if moderation can target content from specific sources

  // Moderation details
  action: Moderation["action"]; // "approve" | "reject"
  moderatorUsername: string; // Username of the moderator
  moderatorPlatformId?: string; // Platform-specific ID of the moderator (e.g., Twitter user ID)
  notes?: string; // Notes from the moderator
  commandExternalId: string; // External ID of the command itself (e.g., the moderator's reply tweet ID)
  commandTimestamp: Date;
}

export interface AdaptedModerationCommand extends BaseAdaptedItem {
  type: "moderationCommand";
  command: ModerationCommandData;
}

// For items that couldn't be clearly adapted or are of an unknown type
export interface AdaptedUnknownItem extends BaseAdaptedItem {
  type: "unknown";
  error?: string; // Optional error message if adaptation failed
}

// Union type for any adapted item
export type AdaptedItem =
  | AdaptedContentSubmission
  | AdaptedModerationCommand
  | AdaptedPendingSubmissionCommand
  | AdaptedUnknownItem;

// Specific type for a submission command that is pending content resolution
export interface AdaptedPendingSubmissionCommand extends BaseAdaptedItem {
  type: "pendingSubmissionCommand";
  targetExternalId: string; // External ID of the content to be submitted
  // Curator information (from the command itself)
  curatorId: string;
  curatorUsername: string;
  curatorPlatformId?: string; // Platform-specific ID of the curator
  curatorActionExternalId: string; // External ID of the !submit command item
  curatorNotes: string | null;
  submittedAt: Date; // Timestamp of the !submit command
  // Any other relevant info from the command itself, like hashtags for feed targeting
  potentialTargetFeedIds?: string[]; // e.g. from hashtags in the command
}
