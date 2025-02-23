import { SubmissionStatus } from "./twitter";

export interface GlobalConfig {
  botId: string;
  defaultStatus: SubmissionStatus;
  maxDailySubmissionsPerUser: number;
  blacklist: Record<string, string[]>;
}

export interface PluginConfig {
  type: "distributor" | "transformer";
  url: string;
  config?: Record<string, unknown>;
}

export interface ModerationConfig {
  approvers: {
    twitter: string[];
  };
}

export interface TransformConfig {
  plugin: string;
  config: Record<string, unknown>;
}

export interface DistributorConfig {
  plugin: string;
  config: Record<string, string>;
  transform?: TransformConfig[]; // Per-distributor transforms
}

export interface StreamConfig {
  enabled: boolean;
  transform?: TransformConfig[]; // Global transforms
  distribute?: DistributorConfig[];
}

export interface RecapConfig {
  enabled: boolean;
  schedule: string;
  transform?: TransformConfig[]; // Global transforms for recap
  distribute: DistributorConfig[];
}

export type PluginsConfig = Record<string, PluginConfig>;

export interface FeedConfig {
  id: string;
  name: string;
  description: string;
  moderation: ModerationConfig;
  outputs: {
    stream?: StreamConfig;
    recap?: RecapConfig;
  };
}

export interface AppConfig {
  global: GlobalConfig;
  plugins: PluginsConfig;
  feeds: FeedConfig[];
}
