import { PluginRepository, type DB } from "@curatedotfun/shared-db";
import type {
  BotPlugin,
  DistributorPlugin,
  PluginType,
  PluginTypeMap,
  SourceItem,
  SourcePlugin,
  TransformerPlugin,
} from "@curatedotfun/types";
import { PluginError, PluginErrorCode, logger } from "@curatedotfun/utils";
import { performReload } from "@module-federation/node/utils";
import { init, loadRemote } from "@module-federation/runtime";
import Mustache from "mustache";
import type { Logger } from "pino";
import { logPluginError } from "../utils/error";
import { isProduction } from "./config.service";
import { IBaseService } from "./interfaces/base-service.interface";
import { createPluginInstanceKey } from "../utils/plugin";

export interface PluginConfig<T extends string = string> {
  type: T;
  url: string;
  config?: Record<string, unknown>;
}

/**
 * Cache entry for a loaded plugin
 */
export interface PluginCache<T extends PluginType, P extends BotPlugin> {
  instance: P & {
    __config: PluginConfig<T>;
  };
  lastLoaded: Date;
}

interface RemoteConfig {
  name: string;
  entry: string;
}

interface RemoteState<T extends PluginType = PluginType> {
  config: RemoteConfig;
  loadedAt?: Date;
  module?: new () => PluginTypeMap<
    unknown,
    unknown,
    Record<string, unknown>
  >[T];
  status: "active" | "loading" | "failed";
  lastError?: Error;
}

interface InstanceState<T extends PluginType> {
  instance: PluginTypeMap<unknown, unknown, Record<string, unknown>>[T];
  config: PluginConfig<T>;
  loadedAt: Date;
  authFailures: number;
  remoteName: string;
}

type PluginContainer<
  T extends PluginType,
  TInput = unknown,
  TOutput = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      default?: new () => PluginTypeMap<TInput, TOutput, TConfig>[T];
    }
  | (new () => PluginTypeMap<TInput, TOutput, TConfig>[T]);

/**
 * PluginService manages the complete lifecycle of plugins including loading,
 * initialization, caching, endpoint registration, and cleanup.
 */
export class PluginService implements IBaseService {
  private remotes: Map<string, RemoteState> = new Map();
  private instances: Map<string, InstanceState<PluginType>> = new Map();

  // Time in milliseconds before cached items are considered stale
  private readonly instanceCacheTimeout: number = 7 * 24 * 60 * 60 * 1000; // 7 days (instance of a plugin with config)
  private readonly moduleCacheTimeout: number = isProduction
    ? 30 * 60 * 1000
    : 10 * 1000; // 30 minutes in production (module loaded from remote), 10 seconds in development
  private readonly maxAuthFailures: number = 2; // one less than 3 to avoid locking
  private readonly retryDelays: number[] = [1000, 5000]; // Delays between retries in ms

  public readonly logger: Logger;
  constructor(
    private pluginRepository: PluginRepository,
    private db: DB,
    private env: { [key: string]: any },
    logger: Logger,
  ) {
    this.logger = logger;
  }

  /**
   * Gets or creates a plugin instance with the specified configuration
   */
  public async getPlugin<
    T extends PluginType,
    TInput = unknown,
    TOutput = unknown,
    TConfig extends Record<string, unknown> = Record<string, unknown>,
  >(
    name: string,
    pluginConfig: { type: T; config: TConfig },
  ): Promise<PluginTypeMap<TInput, TOutput, TConfig>[T]> {
    try {
      // Get plugin metadata from database
      const registeredPlugin =
        await this.pluginRepository.getPluginByName(name);

      if (!registeredPlugin) {
        const error = new PluginError(
          `Plugin ${name} not found in database`,
          {
            pluginName: name,
            operation: "load",
          },
          PluginErrorCode.PLUGIN_INITIALIZATION_FAILED,
          false,
        );
        logPluginError(error, this.logger);
        throw error;
      }

      // Validate requested type matches registered type
      if (pluginConfig.type !== registeredPlugin.type) {
        const error = new PluginError(
          `Plugin type mismatch: requested ${pluginConfig.type}, but plugin is registered as ${registeredPlugin.type}`,
          {
            pluginName: name,
            operation: "load",
          },
          PluginErrorCode.PLUGIN_CONFIG_INVALID,
          false,
          {
            details: {
              requestedType: pluginConfig.type,
              registeredType: registeredPlugin.type,
              entryPoint: registeredPlugin.entryPoint,
            },
          },
        );
        logPluginError(error, this.logger);
        throw error;
      }

      // Create full config with URL from database
      const config: PluginConfig<T> = {
        type: pluginConfig.type,
        url: registeredPlugin.entryPoint,
        config: pluginConfig.config,
      };

      const normalizedName = this.packageToRemoteName(name);
      const instanceId = createPluginInstanceKey(normalizedName, config);

      // Check existing instance
      const instance = this.instances.get(instanceId);
      if (instance) {
        if (instance.authFailures >= this.maxAuthFailures) {
          const error = new PluginError(
            `Plugin ${name} disabled due to auth failures`,
            {
              pluginName: name,
              operation: "load",
            },
            PluginErrorCode.PLUGIN_AUTHENTICATION_FAILURE,
            false,
          );
          logPluginError(error, this.logger);
          throw error;
        }

        if (!this.isStale(instance.loadedAt, this.instanceCacheTimeout)) {
          return instance.instance as PluginTypeMap<
            TInput,
            TOutput,
            TConfig
          >[T];
        }
      }

      // Get or initialize remote
      let remote = this.remotes.get(normalizedName);
      if (!remote) {
        remote = {
          config: { name: normalizedName, entry: config.url },
          status: "active",
        };
        this.remotes.set(normalizedName, remote);
      }

      // Create and initialize instance with retries
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
        try {
          // Load module if needed
          if (
            !remote.module ||
            !remote.loadedAt ||
            this.isStale(remote.loadedAt, this.moduleCacheTimeout)
          ) {
            remote.status = "loading";
            await this.loadModule(remote);
          }

          if (!remote.module || remote.status === "failed") {
            throw remote.lastError || new Error("Module loading failed");
          }

          // Create and initialize instance
          const newInstance = new remote.module() as PluginTypeMap<
            TInput,
            TOutput,
            TConfig
          >[T];

          // Hydrate config with environment variables
          const stringifiedConfig = JSON.stringify(config.config);
          const populatedConfigString = Mustache.render(
            stringifiedConfig,
            this.env,
          ); // TODO: Whitelist values
          const hydratedConfig = JSON.parse(populatedConfigString) as TConfig;

          await newInstance.initialize(hydratedConfig);

          // // Validate instance implements required interface
          // if (!this.validatePluginInterface<T, TInput, TOutput, TConfig>(newInstance, config.type)) {
          //   throw new PluginInitError(
          //     name,
          //     new Error(
          //       `Plugin does not implement required ${config.type} interface`,
          //     ),
          //   );
          // }

          // Cache successful instance
          const instanceState: InstanceState<T> = {
            instance: newInstance as PluginTypeMap<
              unknown,
              unknown,
              Record<string, unknown>
            >[T],
            config: config as PluginConfig<T>,
            loadedAt: new Date(),
            authFailures: 0,
            remoteName: normalizedName,
          };
          this.instances.set(instanceId, instanceState);

          return newInstance;
        } catch (error) {
          lastError = error as Error;

          // Track auth failure
          if (instance) {
            instance.authFailures += 1;

            if (instance.authFailures >= this.maxAuthFailures) {
              const error = new PluginError(
                `Plugin ${name} disabled after ${instance.authFailures} auth failures`,
                {
                  pluginName: name,
                  operation: "load",
                  attempt: instance.authFailures,
                },
                PluginErrorCode.PLUGIN_AUTHENTICATION_FAILURE,
                false,
              );
              logPluginError(error, this.logger);
              throw error;
            }
          }

          // If we have more retries, wait and try again
          if (attempt < this.retryDelays.length) {
            logger.warn(
              `Plugin ${name} initialization failed, retrying in ${this.retryDelays[attempt]}ms`,
              { error },
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryDelays[attempt]),
            );
          }
        }
      }

      // If we get here, all retries failed
      // Clean up failed remote
      const error = new PluginError(
        lastError?.message || `Failed to initialize plugin ${name}`,
        {
          pluginName: name,
          operation: "load",
        },
        PluginErrorCode.PLUGIN_INITIALIZATION_FAILED,
        false,
        { cause: lastError || undefined },
      );
      logPluginError(error, this.logger);
      throw error;
    } catch (error) {
      logger.error(`Plugin error: ${name}`, { error });
      throw error instanceof PluginError
        ? error
        : new PluginError(
            `Unexpected error with plugin ${name}`,
            {
              pluginName: name,
              operation: "unknown",
            },
            PluginErrorCode.UNKNOWN_PLUGIN_ERROR,
            false,
            {
              cause: error instanceof Error ? error : undefined,
            },
          );
    }
  }

  /**
   * Loads a plugin module
   */
  private async loadModule<T extends PluginType>(
    remote: RemoteState<T>,
  ): Promise<void> {
    try {
      // Initialize Module Federation with all active remotes
      await performReload(true);
      init({
        name: "host",
        remotes: Array.from(this.remotes.values()).map((r) => r.config),
      });

      const container = await loadRemote<PluginContainer<T>>(
        `${remote.config.name}/plugin`,
      );
      if (!container) {
        const error = new PluginError(
          "Plugin module not found",
          {
            pluginName: remote.config.name,
            operation: "load",
          },
          PluginErrorCode.PLUGIN_INITIALIZATION_FAILED,
          false,
          {
            details: { entryPoint: remote.config.entry },
          },
        );
        logPluginError(error, this.logger);
        throw error;
      }

      // Handle both default export and direct constructor
      const module =
        typeof container === "function" ? container : container.default;

      if (!module || typeof module !== "function") {
        const error = new PluginError(
          "Invalid plugin format - no constructor found",
          {
            pluginName: remote.config.name,
            operation: "load",
          },
          PluginErrorCode.PLUGIN_INITIALIZATION_FAILED,
          false,
          {
            details: { entryPoint: remote.config.entry },
          },
        );
        logPluginError(error, this.logger);
        throw error;
      }

      remote.module = module;
      remote.loadedAt = new Date();
      remote.status = "active";
      remote.lastError = undefined;

      logger.info(`Loaded module for remote ${remote.config.name}`, {
        activeRemotes: Array.from(this.remotes.keys()),
      });
    } catch (error) {
      remote.status = "failed";
      remote.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Cleans up all plugin instances
   */
  public async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // Cleanup instances
    for (const [id, state] of this.instances) {
      if ((state.instance as BotPlugin).shutdown) {
        try {
          await (state.instance as BotPlugin).shutdown!();
        } catch (error) {
          const pluginError = new PluginError(
            `Failed to shutdown plugin instance ${id}`,
            {
              pluginName: state.remoteName,
              operation: "shutdown",
            },
            PluginErrorCode.PLUGIN_SHUTDOWN_FAILED,
            false,
            {
              cause: error instanceof Error ? error : undefined,
              details: { instanceId: id },
            },
          );
          errors.push(pluginError);
          logger.error(`Shutdown error`, {
            error: pluginError,
            config: state.config,
          });
        }
      }
    }

    this.instances.clear();
    this.remotes.clear();

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Some plugins failed to shutdown properly`,
      );
    }
  }

  /**
   * Validates that a plugin instance implements the required interface
   */
  private validatePluginInterface<
    T extends PluginType,
    TInput = unknown,
    TOutput = unknown,
    TConfig extends Record<string, unknown> = Record<string, unknown>,
  >(
    instance: BotPlugin<TConfig>,
    type: T,
  ): instance is PluginTypeMap<TInput, TOutput, TConfig>[T] {
    if (!instance || typeof instance !== "object") return false;
    if (typeof instance.initialize !== "function") return false;
    if (instance.type !== type) {
      logger.warn(
        `Plugin instance type mismatch: expected ${type}, got ${instance.type}`,
        { name: (instance as any)?.constructor?.name },
      );
      return false;
    }

    switch (type) {
      case "distributor":
        return (
          typeof (instance as DistributorPlugin<TInput, TConfig>).distribute ===
          "function"
        );
      case "transformer": {
        const transformer = instance as TransformerPlugin<
          TInput,
          TOutput,
          TConfig
        >;
        return typeof transformer.transform === "function";
      }
      case "source": {
        const source = instance as SourcePlugin<SourceItem, TConfig>;
        return typeof source.search === "function";
      }
      default:
        // This case should ideally not be reached if PluginType is a comprehensive union
        // and all cases are handled.
        logger.warn(`Unknown plugin type encountered in validation: ${type}`);
        return false;
    }
  }

  /**
   * Checks if a cached item is stale
   */
  private isStale(loadedAt: Date | undefined, timeout: number): boolean {
    if (!loadedAt) return true;
    return Date.now() - loadedAt.getTime() > timeout;
  }

  /**
   * Force reloads all plugin modules and clears instance caches.
   * This ensures the latest versions of plugins are loaded on next use.
   */
  public async reloadAllPlugins(): Promise<void> {
    // Clean up existing instances
    await this.cleanup();

    // Force module federation reload
    await performReload(true);

    logger.info("All plugins reloaded");
  }

  /**
   * Converts a package name to a valid Module Federation remote name
   */
  private packageToRemoteName(packageName: string): string {
    // Remove @ symbol and convert / to underscore
    // e.g. "@curatedotfun/telegram" -> "curatedotfun_telegram"
    return packageName.toLowerCase().replace("@", "").replace("/", "_");
  }
}
