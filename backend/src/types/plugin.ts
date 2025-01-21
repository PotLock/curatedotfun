import type { DBOperations } from "../services/db/operations";
import { SubmissionData, SubmissionMetadata } from "../services/db/types";

// Base plugin interface types
interface BasePlugin {
  name: string;
  initialize(config: Record<string, string>): Promise<void>;
  shutdown?(): Promise<void>;
}

// Plugin for handling incoming submissions from different platforms
export interface InboundPlugin extends BasePlugin {
  /**
   * Generate a unique ID for a submission
   * Each platform can implement its own strategy
   */
  generateSubmissionId(input: Record<string, any>): string;

  /**
   * Get submission data from the platform
   * Returns the content data and metadata for storage
   */
  getSubmission(input: Record<string, any>): Promise<{
    data: SubmissionData;
    metadata: SubmissionMetadata;
  }>;

  /**
   * Validate submission data and metadata
   * Each platform can implement its own validation rules
   */
  validateSubmission(data: SubmissionData, metadata: SubmissionMetadata): boolean;

  /**
   * Transform submission for display
   * Each platform can implement its own display format
   */
  formatSubmission(data: SubmissionData, metadata: SubmissionMetadata): {
    content: string;
    curator: string;
    source: string;
    timestamp: string;
    [key: string]: any;
  };

  handleAcknowledgement(metadata: SubmissionMetadata): Promise<void>
}

// Plugin for distributing content
export interface DistributorPlugin extends BasePlugin {
  initialize(config: Record<string, string> & { feedId: string }): Promise<void>;
  distribute(feedId: string, content: string): Promise<void>;
}

// Plugin for transforming content
export interface TransformerPlugin extends BasePlugin {
  transform(content: string): Promise<string>;
}

// Union type of all plugin types
export type Plugin = InboundPlugin | DistributorPlugin | TransformerPlugin;

export interface PluginModule {
  default: new (dbOperations?: DBOperations) => Plugin;
}
