export type PluginType = "transformer" | "distributor" | "source";

// --- General Plugin Configuration Types ---

/**
 * Configuration for registering a plugin in the application.
 * TConfig is the static configuration for the plugin instance.
 */
export interface PluginRegistrationConfig<
  PType extends PluginType = PluginType,
  TConfig = Record<string, unknown>,
> {
  type: PType;
  url: string; // URL for Module Federation or path for local loading
  config?: TConfig; // Static configuration for this plugin instance
}

// Base plugin interface
export interface BotPlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  type: PluginType;
  initialize: (config?: TConfig) => Promise<void>;
  shutdown?: () => Promise<void>;
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
 * State passed between search calls to enable resumption.
 * TData is expected to be an object conforming to PlatformState or a derivative.
 */
export interface LastProcessedState<
  TData extends PlatformState = PlatformState,
> {
  // The `data` field holds the strongly-typed, platform-specific state.
  data: TData;
  // Optional: A unique identifier for this state object itself, if needed for storage/retrieval.
  // id?: string;
  // Optional: Timestamp of when this state was generated.
  // timestamp?: number;
}

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
  TConfig extends Record<string, unknown> = Record<string, unknown>, // Configuration for the plugin instance
  TPlatformState extends PlatformState = PlatformState, // Generic for the platform-specific part of LastProcessedState
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
    options: SourcePluginSearchOptions<any>, // platformArgs will be validated by the service
  ): Promise<SourcePluginSearchResults<TItem, TPlatformState>>;
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
  // Optionally, store the original query or parameters for this job
  // queryDetails?: Record<string, any>;
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

// Standard Service Interface for platform-specific search services
export interface IPlatformSearchService<
  TItem extends SourceItem,
  TPlatformOptions = Record<string, unknown>,
  // TPlatformState now extends the new generic PlatformState
  TPlatformState extends PlatformState = PlatformState,
> {
  initialize?(config?: any): Promise<void>;
  search(
    options: TPlatformOptions,
    // currentState now uses the generic LastProcessedState with TPlatformState
    currentState: LastProcessedState<TPlatformState> | null,
  ): Promise<{ items: TItem[]; nextStateData: TPlatformState | null }>;
  shutdown?(): Promise<void>; // Added for service cleanup
}

/**
 * The structure of an individual item returned by a source plugin.
 * This is the `TItem` in `SourcePluginSearchResults`.
 */
export interface SourceItem {
  id: string; // Unique identifier for the item from the source plugin/platform (e.g., Masa's ID)
  externalId: string; // Platform-specific external identifier (e.g., Tweet ID, Reddit post ID)
  content: string; // Main text content of the item
  createdAt?: string; // ISO 8601 timestamp of item creation on the original platform
  author?: {
    id?: string; // Author's platform-specific user ID
    username?: string; // Author's username or handle
    displayName?: string; // Author's display name
    [key: string]: any; // Other author-specific details
  };
  metadata?: {
    sourcePlugin: string; // Name of the plugin that sourced this item
    searchType: string; // The 'type' from SourcePluginSearchOptions used
    url?: string; // URL to the original item
    language?: string; // Language code
    isReply?: boolean;
    inReplyToId?: string; // External ID of the item this is a reply to
    conversationId?: string;
    [key: string]: any; // Other platform-specific or plugin-specific metadata
  };
  raw?: any; // Optional: The original raw data from the source, for debugging or advanced processing
  [key: string]: any; // Other top-level fields from the source
}
