export interface DistributorPlugin {
  name: string;
  initialize(feedId: string, config: Record<string, string>): Promise<void>;
  distribute(feedId: string, content: string): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface TransformerPlugin {
  name: string;
  initialize(config: Record<string, string>): Promise<void>;
  transform(content: string): Promise<string>;
  shutdown?(): Promise<void>;
}

export type Plugin = DistributorPlugin | TransformerPlugin;

import type { DBOperations } from "../services/db/operations";

export interface PluginModule {
  default: new (dbOperations?: DBOperations) => Plugin;
}
