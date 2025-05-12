import { TransformConfig, DistributorConfig as ConfigDistributorConfig } from '../../types/config';

/**
 * Generic interface for data returned by source plugins
 */
export interface SourceData {
  id: string; // Unique ID for this piece of data from the source
  content: any; // The actual data content
  timestamp: Date;
  sourcePlugin: string; // Name of the plugin that fetched this
  [key: string]: any; // Allow for other source-specific fields
}

/**
 * Interface for source plugins
 */
export interface ISourcePlugin<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  type: 'source';
  initialize(config: TConfig): Promise<void>;
  fetchData(config: TConfig, lastProcessedId?: string): Promise<SourceData[]>;
  shutdown?(): Promise<void>;
}

/**
 * Configuration for a source plugin within a rule
 */
export interface RuleSourceConfig {
  plugin: string; // Name of the source plugin
  config: Record<string, any>; // Plugin-specific configuration
  id: string; // Unique ID for this source instance within the rule, for state tracking
}

/**
 * Configuration for a condition within a rule
 */
export interface RuleConditionConfig {
  type: 'aiPrompt' | 'jsonLogic' | 'codeExpression'; // Add more as needed
  plugin?: string; // For aiPrompt, the transformer plugin
  config?: Record<string, any>; // Config for the condition (e.g., AI prompt, schema)
  evaluation: string; // How to evaluate (e.g., "output.sentiment === 'positive'")
}

// Re-export DistributorConfig from config.ts to avoid naming conflicts
export type DistributorConfig = ConfigDistributorConfig;

/**
 * Configuration for actions to take when a rule's conditions are met
 */
export interface RuleActionConfig {
  transform?: TransformConfig[]; // Existing TransformConfig
  distribute?: DistributorConfig[]; // Distribution configurations
}

/**
 * Configuration for a rule
 */
export interface RuleConfig {
  id: string;
  description: string;
  enabled: boolean; // To enable/disable rules
  trigger: {
    type: 'manual' | 'event' | 'scheduled';
  };
  sources: RuleSourceConfig[];
  conditions?: RuleConditionConfig[];
  actions: RuleActionConfig;
}

/**
 * Result of processing a rule
 */
export interface RuleProcessingResult {
  ruleId: string;
  success: boolean;
  message: string;
  processedItems: number;
  errors?: Error[];
}
