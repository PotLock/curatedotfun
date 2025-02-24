export interface DistributorPlugin {
  name: string;
  initialize(feedId: string, config: Record<string, string>): Promise<void>;
  distribute(feedId: string, submission: TwitterSubmission): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface TransformerPlugin {
  name: string;
  initialize(config: Record<string, string>): Promise<void>;
  transform(submission: TwitterSubmission): Promise<string>;
  shutdown?(): Promise<void>;
}

export type Plugin = DistributorPlugin | TransformerPlugin;

import type { DBOperations } from "../services/db/operations";
import { TwitterSubmission } from "./twitter";

export interface PluginModule {
  default: new (dbOperations?: DBOperations) => Plugin;
}
