export type PipelineItemStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processed"
  | "failed"
  | "auto-approved";

export interface PipelineItem {
  /**
   * Unique identifier for this item's instance within a specific pipeline.
   * Could be a composite ID (e.g., originalContentExternalId + pipelineId) or a new UUID.
   */
  id: string;
  /** The ID of the pipeline (e.g., feed ID) this item belongs to. */
  pipelineId: string;
  /** External ID of the original source content (e.g., Tweet ID, Reddit Post ID). */
  originalContentExternalId: string;

  /** The main textual content of the item. */
  content: string;
  /** Username of the original author of the content. */
  authorUsername?: string;

  /** Username of the user who curated/submitted this item. */
  curatorUsername?: string;
  /** Notes provided by the curator during submission. */
  curatorNotes?: string;
  /** Identifier of the event that triggered the curation (e.g., ID of the curator's '!submit' tweet). */
  curatorTriggerEventId?: string;

  /** Current status of the item within this pipeline. */
  status: PipelineItemStatus;

  /** Details related to the moderation action performed on this item. */
  moderation?: {
    moderatorUsername?: string;
    action?: "approve" | "reject";
    notes?: string;
    /** Identifier of the event that triggered this moderation action (e.g., ID of the moderator's '!approve' tweet). */
    moderationTriggerEventId?: string;
    timestamp?: Date;
  };

  /**
   * Optional field to store the raw submission details or a reference to the original RichSubmission object.
   * Useful during incremental refactoring.
   */
  rawSubmissionDetails?: any;

  /** Timestamp of when this item was created in the pipeline. */
  createdAt?: Date;
  /** Timestamp of when this item was last updated. */
  updatedAt?: Date;
  /** Timestamp of when this item was processed for distribution. */
  processedAt?: Date;
}
