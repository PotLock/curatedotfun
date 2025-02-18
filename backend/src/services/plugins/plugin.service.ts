import { performReload } from "@module-federation/node/utils";
import { init, loadRemote } from "@module-federation/runtime";
import { Elysia } from "elysia";
import { PluginError, PluginInitError, PluginLoadError } from "../../types/errors";
import {
  BotPlugin,
  PluginConfig,
  PluginType,
  PluginTypeMap,
} from "../../types/plugins";
import { logger } from "../../utils/logger";
import { createPluginInstanceKey } from "../../utils/plugin";

export interface PluginEndpoint { // move to types
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  handler: (ctx: any) => Promise<any>;
}

interface PluginWithEndpoints extends BotPlugin<Record<string, unknown>> { // move to types
  getEndpoints?: () => PluginEndpoint[];
}

interface ModuleCache<T extends PluginType> {
  module: new () => PluginTypeMap<unknown, unknown, Record<string, unknown>>[T];
  loadedAt: Date;
}

interface InstanceCache<T extends PluginType> {
  instance: PluginTypeMap<unknown, unknown, Record<string, unknown>>[T];
  config: PluginConfig<T, Record<string, unknown>>;
  loadedAt: Date;
}

/**
 * PluginService manages the complete lifecycle of plugins including loading,
 * initialization, caching, endpoint registration, and cleanup.
 */
export class PluginService {
  private static instance: PluginService;
  private moduleCache: Map<string, ModuleCache<PluginType>> = new Map();
  private instanceCache: Map<string, InstanceCache<PluginType>> = new Map();
  private endpoints: Map<string, PluginEndpoint[]> = new Map();
  private loadedConfigs: Record<string, PluginConfig<PluginType, any>> = {};
  private app: Elysia | null = null;

  // Time in milliseconds before cached items are considered stale
  private readonly cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  // TODO: Module cache should be shorter than instance cache (instance cache may not even need to expire)
  private constructor() {}

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
  public setApp(app: Elysia) {
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
    TConfig extends Record<string, unknown> = Record<string, unknown>
  >(
    name: string,
    config: PluginConfig<T, TConfig>
  ): Promise<PluginTypeMap<TInput, TOutput, TConfig>[T]> {
    try {
      const instanceId = createPluginInstanceKey(name, config);
      const cached = this.instanceCache.get(instanceId);

      if (cached && !this.isStale(cached.loadedAt)) {
        return cached.instance as PluginTypeMap<TInput, TOutput, TConfig>[T];
      }

      // Load module with correct type
      const module = await this.loadModule<T>(name, config.url);

      // Create and initialize instance
      let instance: PluginTypeMap<TInput, TOutput, TConfig>[T];
      try {
        instance = new module() as PluginTypeMap<TInput, TOutput, TConfig>[T];
        await instance.initialize(config.config);
      } catch (error) {
        throw new PluginInitError(name, error as Error);
      }

      // Validate instance implements required interface
      if (!this.validatePluginInterface(instance, config.type)) {
        throw new PluginInitError(
          name,
          new Error(`Plugin does not implement required ${config.type} interface`)
        );
      }

      // Register endpoints if available
      if (this.app && (instance as PluginWithEndpoints).getEndpoints) {
        const endpoints = (instance as PluginWithEndpoints).getEndpoints!();
        this.registerEndpoints(name, endpoints);
      }

      // Cache instance
      this.instanceCache.set(instanceId, {
        instance: instance as PluginTypeMap<unknown, unknown, Record<string, unknown>>[T],
        config: config as PluginConfig<T, Record<string, unknown>>,
        loadedAt: new Date()
      });

      return instance;
    } catch (error) {
      logger.error(`Plugin error: ${name}`, { error, config });
      throw error instanceof PluginError ? error : new PluginError(
        `Unexpected error with plugin ${name}`,
        error as Error
      );
    }
  }

  /**
   * Gets the configurations of all loaded plugins
   */
  public getLoadedConfigs(): Record<string, PluginConfig<PluginType, any>> {
    return { ...this.loadedConfigs };
  }

  /**
   * Initializes plugins from configuration
   */
  public async initializePlugins(
    plugins: Record<string, PluginConfig<PluginType, any>>
  ): Promise<void> {
    // Store configs first so they're available during plugin loading
    this.loadedConfigs = { ...plugins };
    
    const errors: Error[] = [];
    for (const [name, config] of Object.entries(this.loadedConfigs)) {
      try {
        logger.info(`Loading plugin: ${name}`);
        await this.getPlugin(name, config);
      } catch (error) {
        logger.error(`Failed to load plugin ${name}:`, error);
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Failed to initialize ${errors.length} plugins`
      );
    }
  }

  /**
   * Cleans up all plugin instances
   */
  public async cleanup(): Promise<void> {
    const errors: Error[] = [];

    for (const [id, { instance, config }] of this.instanceCache) {
      if ((instance as BotPlugin).shutdown) {
        try {
          await (instance as BotPlugin).shutdown!();
        } catch (error) {
          const pluginError = new PluginError(
            `Failed to shutdown plugin instance ${id}`,
            error as Error
          );
          errors.push(pluginError);
          logger.error(`Shutdown error`, { error: pluginError, config });
        }
      }
    }

    this.instanceCache.clear();
    this.moduleCache.clear();
    this.endpoints.clear();
    this.loadedConfigs = {};

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Some plugins failed to shutdown properly`
      );
    }
  }

  /**
   * Loads a plugin module, using cache if available
   */
  private async loadModule<T extends PluginType>(
    name: string, 
    url: string
  ): Promise<new () => PluginTypeMap<unknown, unknown, Record<string, unknown>>[T]> {
    try {
      const cached = this.moduleCache.get(name);
      if (cached && !this.isStale(cached.loadedAt)) {
        return cached.module as new () => PluginTypeMap<unknown, unknown, Record<string, unknown>>[T];
      }

      await this.initModuleFederation(name, url);
      const container = await loadRemote(`${name}/plugin`) as { 
        default?: new () => PluginTypeMap<unknown, unknown, Record<string, unknown>>[T]
      } | (new () => PluginTypeMap<unknown, unknown, Record<string, unknown>>[T]);

      if (!container) {
        throw new PluginLoadError(
          name,
          url,
          new Error('Plugin module not found')
        );
      }

      // Handle both default export and direct constructor
      const module = typeof container === 'function' ? container : container.default;
      
      if (!module || typeof module !== 'function') {
        throw new PluginLoadError(
          name,
          url,
          new Error('Invalid plugin format - no constructor found')
        );
      }

      this.moduleCache.set(name, {
        module,
        loadedAt: new Date()
      } as ModuleCache<T>);

      return module;
    } catch (error) {
      if (error instanceof PluginError) throw error;
      throw new PluginLoadError(name, url, error as Error);
    }
  }

  /**
   * Initializes Module Federation for a plugin
   */
  private async initModuleFederation(name: string, url: string): Promise<void> {
    await performReload(true);
    await init({
      name: "host",
      remotes: [
        {
          name,
          entry: url,
        },
      ],
    });
  }

  /**
   * Registers plugin endpoints with the Elysia app
   */
  private registerEndpoints(name: string, endpoints: PluginEndpoint[]): void {
    if (!this.app) {
      this.endpoints.set(name, endpoints);
      return;
    }

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
  }

  /**
   * Validates that a plugin instance implements the required interface
   */
  private validatePluginInterface(instance: any, type: PluginType): boolean {
    if (!instance || typeof instance !== 'object') return false;

    switch (type) {
      case 'distributor':
        return typeof instance.distribute === 'function';
      case 'transform':
        return typeof instance.transform === 'function';
      default:
        return false;
    }
  }

  /**
   * Checks if a cached item is stale
   */
  private isStale(loadedAt: Date): boolean {
    return Date.now() - loadedAt.getTime() > this.cacheTimeout;
  }
}
