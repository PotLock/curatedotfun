import { performReload } from "@module-federation/node/utils";
import { init, loadRemote } from "@module-federation/runtime";
import {
  PluginError,
  PluginInitError,
  PluginLoadError,
} from "../../types/errors";

import {
  BotPlugin,
  DistributorPlugin,
  PluginConfig,
  PluginType,
  PluginTypeMap,
  TransformerPlugin,
} from "@curatedotfun/types";
import { logger } from "../../utils/logger";
import { createPluginInstanceKey } from "../../utils/plugin";
import { ConfigService, isProduction } from "../config/config.service";
import { Hono } from "hono";

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

export interface PluginEndpoint {
  // move to types
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  handler: (ctx: import("hono").Context) => Promise<Response>;
}

interface PluginWithEndpoints extends BotPlugin<Record<string, unknown>> {
  // move to types
  getEndpoints?: () => PluginEndpoint[];
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
  config: PluginConfig<T, Record<string, unknown>>;
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
export class PluginService {
  private static instance: PluginService;
  private remotes: Map<string, RemoteState> = new Map();
  private instances: Map<string, InstanceState<PluginType>> = new Map();
  private endpoints: Map<string, PluginEndpoint[]> = new Map();
  private app: Hono | null = null;
  private configService: ConfigService;

  // Time in milliseconds before cached items are considered stale
  private readonly instanceCacheTimeout: number = 7 * 24 * 60 * 60 * 1000; // 7 days (instance of a plugin with config)
  private readonly moduleCacheTimeout: number = isProduction
    ? 30 * 60 * 1000
    : 10 * 1000; // 30 minutes in production (module loaded from remote), 10 seconds in development
  private readonly maxAuthFailures: number = 2; // one less than 3 to avoid locking
  private readonly retryDelays: number[] = [1000, 5000]; // Delays between retries in ms

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  /**
   * Gets the singleton instance of PluginService
   */
  public static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService();
    }
    return PluginService.instance;
  }

  /**
   * Sets the Elysia app instance for endpoint registration
   */
  public setApp(app: Hono) {
    this.app = app;
    // Register any pending endpoints
    for (const [name, endpoints] of this.endpoints) {
      this.registerEndpoints(name, endpoints);
    }
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
      // Get plugin metadata from app config
      const pluginMeta = this.configService.getPluginByName(name);

      if (!pluginMeta) {
        throw new PluginLoadError(
          name,
          "",
          new Error(`Plugin ${name} not found in app configuration`),
        );
      }

      // Create full config with URL from app config
      const config: PluginConfig<T, TConfig> = {
        type: pluginConfig.type,
        url: pluginMeta.url,
        config: pluginConfig.config,
      };

      const normalizedName = this.packageToRemoteName(name);
      const instanceId = createPluginInstanceKey(normalizedName, config);

      // Check existing instance
      const instance = this.instances.get(instanceId);
      if (instance) {
        if (instance.authFailures >= this.maxAuthFailures) {
          throw new PluginError(`Plugin ${name} disabled due to auth failures`);
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
          await newInstance.initialize(config.config);

          // // Validate instance implements required interface
          // if (!this.validatePluginInterface<T, TInput, TOutput, TConfig>(newInstance, config.type)) {
          //   throw new PluginInitError(
          //     name,
          //     new Error(
          //       `Plugin does not implement required ${config.type} interface`,
          //     ),
          //   );
          // }

          // Register endpoints if available
          if (this.app && (newInstance as PluginWithEndpoints).getEndpoints) {
            const endpoints = (newInstance as PluginWithEndpoints)
              .getEndpoints!();
            this.registerEndpoints(normalizedName, endpoints);
          }

          // Cache successful instance
          const instanceState: InstanceState<T> = {
            instance: newInstance as PluginTypeMap<
              unknown,
              unknown,
              Record<string, unknown>
            >[T],
            config: config as PluginConfig<T, Record<string, unknown>>,
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
              logger.error(`Plugin ${name} disabled due to auth failures`);
              // Clean up endpoints before disabling
              this.unregisterEndpoints(normalizedName);
              throw new PluginError(
                `Plugin ${name} disabled after ${instance.authFailures} auth failures`,
              );
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
      this.unregisterEndpoints(normalizedName);
      throw lastError || new PluginError(`Failed to initialize plugin ${name}`);
    } catch (error) {
      logger.error(`Plugin error: ${name}`, { error });
      throw error instanceof PluginError
        ? error
        : new PluginError(
            `Unexpected error with plugin ${name}`,
            error as Error,
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
        throw new PluginLoadError(
          remote.config.name,
          remote.config.entry,
          new Error("Plugin module not found"),
        );
      }

      // Handle both default export and direct constructor
      const module =
        typeof container === "function" ? container : container.default;

      if (!module || typeof module !== "function") {
        throw new PluginLoadError(
          remote.config.name,
          remote.config.entry,
          new Error("Invalid plugin format - no constructor found"),
        );
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
      // Clean up failed remote
      this.unregisterEndpoints(remote.config.name);
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
            error as Error,
          );
          errors.push(pluginError);
          logger.error(`Shutdown error`, {
            error: pluginError,
            config: state.config,
          });
        }
      }
      // Clean up endpoints for each instance
      this.unregisterEndpoints(state.remoteName);
    }

    this.instances.clear();
    this.endpoints.clear();
    this.remotes.clear();

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Some plugins failed to shutdown properly`,
      );
    }
  }

  /**
   * Registers plugin endpoints with the Elysia app
   */
  private registerEndpoints(name: string, endpoints: PluginEndpoint[]): void {
    if (!this.app) {
      this.endpoints.set(name, endpoints);
      return;
    }

    // Remove any existing endpoints first
    this.unregisterEndpoints(name);

    for (const endpoint of endpoints) {
      const path = `/plugin/${name}${endpoint.path}`;
      logger.info(`Registering endpoint: ${endpoint.method} ${path}`);

      switch (endpoint.method) {
        case "GET":
          this.app.get(path, endpoint.handler);
          break;
        case "POST":
          this.app.post(path, endpoint.handler);
          break;
        case "PUT":
          this.app.put(path, endpoint.handler);
          break;
        case "DELETE":
          this.app.delete(path, endpoint.handler);
          break;
      }
    }

    // Store new endpoints
    this.endpoints.set(name, endpoints);
  }

  /**
   * Unregisters all endpoints for a plugin
   */
  private unregisterEndpoints(name: string): void {
    if (!this.app) {
      this.endpoints.delete(name);
      return;
    }

    const endpoints = this.endpoints.get(name);
    if (endpoints) {
      for (const endpoint of endpoints) {
        const path = `/plugin/${name}${endpoint.path}`;
        logger.info(`Unregistering endpoint: ${endpoint.method} ${path}`);
        // Note: Elysia doesn't provide a direct way to unregister routes
        // The routes will be overwritten if registered again
        // or cleared when the app is cleaned up
      }
    }
    this.endpoints.delete(name);
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
    if (instance.type !== type) return false;

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
        return (
          typeof transformer.transform === "function" &&
          transformer.type === "transformer"
        );
      }
      default:
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
