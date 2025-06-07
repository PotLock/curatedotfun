export type PluginType = "transformer" | "distributor" | "source";

/**
 * Represents the identifier for a source plugin, typically its registered name.
 * e.g., "twitter-source-v1", "reddit-scraper"
 */
export type SourceType = string;

// --- General Plugin Configuration Types ---

export interface PluginErrorContext {
  pluginName: string;
  operation: string; // 'transform', 'distribute', 'initialize', 'shutdown', etc.
  attempt?: number; // For retry tracking in the service
}

/**
 * Describes the shape of a standardized plugin error object.
 * This interface is implemented by the PluginError class in @curatedotfun/utils.
 */
export interface PluginErrorInterface {
  name: string;
  message: string;
  stack?: string;
  context: PluginErrorContext;
  pluginErrorCode: string;
  retryable: boolean;
  originalError?: Error;

  errorCode: string; // AppErrorCode.PLUGIN_FAILURE
  statusCode: number;
  details?: unknown;
  isOperational: boolean;

  toJSON?: () => Record<string, any>;
}

// Base plugin interface
export interface BotPlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  type: PluginType;
  initialize: (config?: TConfig) => Promise<void>;
  shutdown?: () => Promise<void>;
  /**
   * Optional method for plugins to implement to standardize their error reporting.
   * Services calling the plugin can use this to get a PluginError.
   * If not implemented by the plugin, the service will wrap the error.
   */
  handleError?: (
    error: Error,
    operation: string,
    pluginName: string,
    pluginErrorCode?: string,
    retryable?: boolean,
  ) => PluginErrorInterface;
}

// Specific plugin interfaces
export interface TransformerPlugin<
  TInput = unknown,
  TOutput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "transformer";
  transform: (args: ActionArgs<TInput, TConfig>) => Promise<TOutput>;
}

export interface DistributorPlugin<
  TInput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> extends BotPlugin<TConfig> {
  type: "distributor";
  distribute: (args: ActionArgs<TInput, TConfig>) => Promise<void>;
}

// Plugin action type (used by all plugins)
export interface ActionArgs<TInput = unknown, TConfig = unknown> {
  input: TInput;
  config?: TConfig;
}

/**
 * Plugin type mapping
 */
export type PluginTypeMap<
  TInput = unknown,
  TOutput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
  TItem extends SourceItem = SourceItem,
> = {
  transformer: TransformerPlugin<TInput, TOutput, TConfig>;
  distributor: DistributorPlugin<TInput, TConfig>;
  source: SourcePlugin<TItem, TConfig>;
};

// Source Plugin Types

/**
 * Configuration options for a specific search operation by a SourcePlugin.
 * TPlatformOpts allows for platform-specific arguments.
 */
export interface SourcePluginSearchOptions<
  TPlatformOpts = Record<string, any>,
> {
  type: string; // e.g., "twitter-scraper", "reddit-scraper". The plugin will interpret this.
  query?: string; // General query string. Its interpretation depends on the plugin and the 'type'.
  pageSize?: number; // General hint for how many items to fetch per request. The plugin/service might override or interpret this.
  platformArgs?: TPlatformOpts; // Typed platform-specific arguments

  // Allows for additional dynamic arguments if needed.
  [key: string]: any;
}

/**
 * Defines the progress of a job submitted to an external asynchronous service (e.g., Masa).
 */
export interface AsyncJobProgress {
  jobId: string;
  status: "submitted" | "pending" | "processing" | "done" | "error" | "timeout";
  submittedAt: string; // ISO timestamp
  lastCheckedAt?: string; // ISO timestamp
  errorMessage?: string;
}

/**
 * Generic platform-specific state for managing resumable searches and long-running jobs.
 * This is the `TData` type for `LastProcessedState`.
 */
export interface PlatformState {
  // For overall resumable search (across multiple jobs/chunks)
  // This cursor can be a string, number, or a more complex object
  // depending on the platform's pagination/cursor mechanism.
  latestProcessedId?: string | number | Record<string, any>;

  // For the currently active job (e.g., a Masa search job for one chunk)
  currentAsyncJob?: AsyncJobProgress | null;

  // Allows for other platform-specific state variables
  [key: string]: any;
}

/**
 * State passed between search calls to enable resumption.
 * TData is expected to be an object conforming to PlatformState or a derivative.
 */
export interface LastProcessedState<
  TData extends PlatformState = PlatformState,
> {
  // The `data` field holds the strongly-typed, platform-specific state.
  data: TData;
}

/**
 * Results of a search operation from a SourcePlugin.
 * TItem is the type of items (e.g., SourceItem or MasaSearchResult).
 * TPlatformState is the platform-specific state for resumption.
 */
export interface SourcePluginSearchResults<
  TItem extends SourceItem = SourceItem,
  TPlatformState extends PlatformState = PlatformState,
> {
  items: TItem[];
  nextLastProcessedState: LastProcessedState<TPlatformState> | null;
}

/**
 * Interface for a source plugin.
 * TItem is the type of items the plugin produces (should extend SourceItem).
 * TConfig is the plugin's instance-level configuration.
 * TPlatformState is the platform-specific state used for resumable searches.
 */
export interface SourcePlugin<
  TItem extends SourceItem = SourceItem,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
  TPlatformState extends PlatformState = PlatformState,
> extends BotPlugin<TConfig> {
  type: "source";

  /**
   * Performs a search operation based on the provided state and options.
   * The plugin instance should be initialized with its specific configuration (TConfig)
   * which might include API keys or other static settings.
   *
   * @param lastProcessedState The state from the previous search call, allowing resumption.
   *                           Null if this is the first call or if state is not applicable/reset.
   *                           Now uses the generic LastProcessedState with TPlatformState.
   * @param options An object containing dynamic configuration options for this specific search
   *                call, such as the query, type, and page size.
   * @returns A promise that resolves with the search results and the state to be used
   *          for the next call. SearchResults also becomes generic.
   */
  search(
    lastProcessedState: LastProcessedState<TPlatformState> | null,
    options: SourcePluginSearchOptions<any>,
  ): Promise<SourcePluginSearchResults<TItem, TPlatformState>>;
}

// Standard Service Interface for platform-specific search services
export interface IPlatformSearchService<
  TItem extends SourceItem,
  TPlatformOptions = Record<string, unknown>,
  TPlatformState extends PlatformState = PlatformState,
> {
  initialize?(config?: any): Promise<void>;
  search(
    options: TPlatformOptions,
    currentState: LastProcessedState<TPlatformState> | null,
  ): Promise<{ items: TItem[]; nextStateData: TPlatformState | null }>;
  shutdown?(): Promise<void>;
}

/**
 * The structure of an individual item returned by a source plugin.
 */
export interface SourceItem {
  id: string;
  externalId: string;
  content: string;
  createdAt?: string;
  author?: {
    id?: string;
    username?: string;
    displayName?: string;
    [key: string]: any;
  };
  metadata?: {
    sourcePlugin: string;
    searchType: string;
    url?: string;
    language?: string;
    isReply?: boolean;
    inReplyToId?: string;
    conversationId?: string;
    [key: string]: any;
  };
  raw?: any;
  [key: string]: any;
}

// --- Frontend Specific Plugin Types ---

export type PluginTypeEnum =
  | "transformer"
  | "distributor"
  | "source"
  | "rule"
  | "outcome";

export interface FrontendPlugin {
  id: string;
  name: string;
  repoUrl: string;
  entryPoint: string;
  type: PluginTypeEnum;
  schemaDefinition?: Record<string, any> | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateFrontendPlugin {
  name: string;
  repoUrl: string;
  entryPoint: string;
  type: PluginTypeEnum;
  schemaDefinition?: Record<string, any> | null;
}

export type UpdateFrontendPlugin = Partial<
  Omit<FrontendPlugin, "id" | "createdAt" | "updatedAt" | "name" | "repoUrl">
>;
