import { DistributorConfig, TransformConfig } from "./config.zod";

/**
 * Configuration for a recap job
 */
export interface RecapConfig {
  /** Unique identifier for this recap configuration */
  id: string;

  /** Unique name for this recap configuration */
  name: string;

  /** Whether this recap is enabled */
  enabled: boolean;

  /**
   * Schedule for the recap
   * Can be a cron expression (e.g., "0 0 * * 0") or
   * an interval specification (e.g., "day:1")
   */
  schedule: string;

  /** Timezone for the schedule (e.g., "UTC", "America/New_York") */
  timezone?: string;

  /** Transformations to apply to the collected content */
  transform?: TransformConfig[];

  /** Batch transformations to apply to the collected results */
  batchTransform?: TransformConfig[];

  /** Distribution configurations */
  distribute?: DistributorConfig[];
}

/**
 * State of a recap job
 */
export interface RecapState {
  /** Internal ID for this state record */
  id: number;

  /** Feed ID this recap belongs to */
  feedId: string;

  /** Unique ID of the recap configuration */
  recapId: string;

  /** External job ID from the scheduler service */
  externalJobId: string | null;

  /** Last time this recap was successfully processed */
  lastSuccessfulCompletion: Date | null;

  /** Error message if the last run failed */
  lastRunError: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date | null;
}
