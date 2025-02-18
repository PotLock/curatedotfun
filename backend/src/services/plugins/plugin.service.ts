import { Elysia } from "elysia";
import { PluginLoader } from "./plugin-loader";
import { BotPlugin, PluginConfig, PluginType, PluginTypeMap } from "../../types/plugins";
import { logger } from "../../utils/logger";

export interface PluginEndpoint {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  handler: (ctx: any) => Promise<any>;
}

interface PluginWithEndpoints extends BotPlugin<Record<string, unknown>> {
  getEndpoints?: () => PluginEndpoint[];
}

/**
 * PluginService manages the lifecycle of all plugins including loading,
 * initialization, endpoint registration, and cleanup.
 */
export class PluginService {
  private static instance: PluginService;
  private pluginLoader: PluginLoader;
  private loadedPlugins: Map<string, PluginWithEndpoints> = new Map();
  private app: Elysia | null = null;

  private constructor() {
    this.pluginLoader = new PluginLoader();
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
  public setApp(app: Elysia) {
    this.app = app;
  }

  /**
   * Initializes plugins from configuration
   * 
   * @param plugins Plugin configuration from curate.config.json
   */
  public async initializePlugins(plugins: Record<string, PluginConfig<PluginType, any>>) {
    for (const [name, config] of Object.entries(plugins)) {
      try {
        logger.info(`Loading plugin: ${name}`);
        const plugin = await this.pluginLoader.loadPlugin(name, config);
        this.loadedPlugins.set(name, plugin as PluginWithEndpoints);
        
        // Register endpoints if plugin provides them
        if (this.app && (plugin as PluginWithEndpoints).getEndpoints) {
          const endpoints = (plugin as PluginWithEndpoints).getEndpoints!();
          this.registerPluginEndpoints(name, endpoints);
        }
      } catch (error) {
        logger.error(`Failed to load plugin ${name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Registers plugin-provided endpoints with the Elysia app
   */
  private registerPluginEndpoints(pluginName: string, endpoints: PluginEndpoint[]) {
    if (!this.app) {
      throw new Error("App not initialized. Call setApp before registering endpoints.");
    }

    for (const endpoint of endpoints) {
      const path = `/plugin/${pluginName}${endpoint.path}`;
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
   * Gets a loaded plugin by name
   */
  public getPlugin<
    T extends PluginType,
    TInput = unknown,
    TOutput = unknown,
    TConfig extends Record<string, unknown> = Record<string, unknown>
  >(name: string): PluginTypeMap<TInput, TOutput, TConfig>[T] | null {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) return null;
    return plugin as unknown as PluginTypeMap<TInput, TOutput, TConfig>[T];
  }

  /**
   * Reloads all plugins
   */
  public async reloadPlugins() {
    await this.pluginLoader.reloadAll();
  }

  /**
   * Cleans up all plugins
   */
  public async cleanup() {
    for (const [name, plugin] of this.loadedPlugins.entries()) {
      try {
        if (plugin.shutdown) {
          await plugin.shutdown();
        }
      } catch (error) {
        logger.error(`Error cleaning up plugin ${name}:`, error);
      }
    }
    this.loadedPlugins.clear();
    this.pluginLoader.clearCache();
  }
}
