import { DistributorConfig, TransformConfig } from "./config";

/**
 * Configuration for a recap job
 */
export interface RecapConfig {
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
