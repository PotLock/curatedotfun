/**
 * Core plugin types for curate.fun
 * These types will eventually be moved to @curatedotfun/types
 */

/**
 * Plugin types supported by the system
 */
export type PluginType = "source" | "transform" | "distributor";

/**
 * Base interface for all plugins
 */
export interface BotPlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  version: string;
  initialize(config?: TConfig): Promise<void>;
  shutdown?(): Promise<void>;
}

/**
 * Plugin action arguments
 */
export interface ActionArgs<TInput = unknown, TConfig = unknown> {
  input: TInput;
  config?: TConfig;
}

/**
 * Plugin configuration
 */
export interface PluginConfig<
  T extends PluginType,
  TConfig = Record<string, unknown>,
> {
  type: T;
  url: string;
  config?: TConfig;
}

/**
 * Cache entry for a loaded plugin
 */
export interface PluginCache<T extends PluginType, P extends BotPlugin> {
  instance: P & {
    __config: PluginConfig<
      T,
      P extends BotPlugin<infer C> ? C : Record<string, unknown>
    >;
  };
  lastLoaded: Date;
}

/**
 * Source plugin interface
 */
export interface SourcePlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "source";
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  getLastProcessedId(): string | null;
  setLastProcessedId(id: string): Promise<void>;
}

/**
 * Transformer plugin interface
 */
export interface TransformerPlugin<
  TInput = unknown,
  TOutput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "transform";
  transform(args: ActionArgs<TInput, TConfig>): Promise<TOutput>;
}

/**
 * Distributor plugin interface
 */
export interface DistributorPlugin<
  TInput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "distributor";
  distribute(args: ActionArgs<TInput, TConfig>): Promise<void>;
}

/**
 * Plugin type mapping
 */
export type PluginTypeMap<
  TInput,
  TOutput,
  TConfig extends Record<string, unknown>,
> = {
  source: SourcePlugin<TConfig>;
  transform: TransformerPlugin<TInput, TOutput, TConfig>;
  distributor: DistributorPlugin<TInput, TConfig>;
};

/**
 * Type guards for plugin types
 */
export function isSourcePlugin(plugin: unknown): plugin is SourcePlugin {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "type" in plugin &&
    plugin.type === "source" &&
    "startMonitoring" in plugin &&
    "stopMonitoring" in plugin &&
    "getLastProcessedId" in plugin &&
    "setLastProcessedId" in plugin
  );
}

export function isTransformerPlugin(
  plugin: unknown,
): plugin is TransformerPlugin {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "type" in plugin &&
    plugin.type === "transform" &&
    "transform" in plugin &&
    typeof (plugin as any).transform === "function"
  );
}

export function isDistributorPlugin(
  plugin: unknown,
): plugin is DistributorPlugin {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "type" in plugin &&
    plugin.type === "distributor" &&
    "distribute" in plugin &&
    typeof (plugin as any).distribute === "function"
  );
}
