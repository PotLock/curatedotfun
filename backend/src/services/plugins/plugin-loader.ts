import { loadRemote, init } from "@module-federation/runtime";
import { performReload, revalidate } from "@module-federation/node/utils";
import {
  BotPlugin,
  PluginType,
  PluginTypeMap,
  PluginConfig,
  PluginCache,
} from "@curatedotfun/types";

/**
 * PluginLoader handles the dynamic loading and caching of bot plugins.
 *
 * @example
 * ```typescript
 * const loader = new PluginLoader();
 *
 * // Load a transformer plugin
 * const transformer = await loader.loadPlugin<
 *   "transform",    // plugin type
 *   string,         // input type
 *   number,         // output type
 *   { apiKey: string } // config type
 * >("myTransformer", {
 *   type: "transform",
 *   url: "http://localhost:3000/remoteEntry.js",
 *   config: { apiKey: `${process.env.API_KEY}` }
 * });
 *
 * // Load a distributor plugin
 * const distributor = await loader.loadPlugin<
 *   "distributor",  // plugin type
 *   string,         // input type
 *   never,          // no output type needed
 *   { webhook: string } // config type
 * >("myDistributor", {
 *   type: "distributor",
 *   url: "http://localhost:3001/remoteEntry.js",
 *   config: { webhook: "https://..." }
 * });
 * ```
 */
export class PluginLoader {
  /**
   * Cache for loaded plugin instances.
   *
   * The cache uses a generic BotPlugin type to store instances, which are then
   * cast back to their specific types (TransformerPlugin/DistributorPlugin/etc) when retrieved.
   * We cache the plugin instance along with whatever specific config (__config)
   *
   * @private
   */
  private pluginCache: Map<
    string,
    PluginCache<PluginType, BotPlugin<Record<string, unknown>>>
  > = new Map();

  /**
   * Time in milliseconds before cached plugins are considered stale.
   * REMEMBER: we are loading directly from remotes, so updates may be pushed "on the fly"
   * It is helpful to reduce this interval during plugin development.
   * @private
   */
  private reloadIntervalMs: number;

  /**
   * Creates a new PluginLoader instance.
   *
   * @param reloadInterval - Time in milliseconds before cached plugins are reloaded (default: 5 minutes)
   */
  constructor(reloadInterval: number = 5 * 60 * 1000) {
    this.reloadIntervalMs = reloadInterval;
  }

  /**
   * Initializes Module Federation for a plugin.
   *
   * @param name - Unique identifier for the plugin
   * @param remoteUrl - URL where the plugin is hosted
   * @private
   */
  private async initModuleFederation(name: string, remoteUrl: string) {
    await performReload(true);
    return init({
      name: "host",
      remotes: [
        {
          name: name,
          entry: remoteUrl,
        },
      ],
    });
  }

  /**
   * Loads a plugin dynamically using Module Federation.
   *
   * @template T - The type of plugin ("transform" | "distributor")
   * @template TInput - The type of data the plugin accepts as input
   * @template TOutput - For transform plugins, the type of data returned. For distributor plugins, use 'never'
   * @template TConfig - The configuration object type for the plugin
   *
   * @param name - Unique identifier for the plugin
   * @param pluginConfig - Plugin configuration including URL and type-safe config object
   * @returns A promise that resolves to the loaded plugin instance
   *
   * @example
   * // Transform plugin that converts string to number
   * const numberify = await loadPlugin<"transform", string, number>(...);
   * const result = await numberify.transform({ input: "42" });
   *
   * @example
   * // Distributor plugin that sends strings to a webhook
   * const webhook = await loadPlugin<"distributor", string>(...);
   * await webhook.distribute({ input: "Hello" });
   *
   * @throws {Error} If the plugin cannot be loaded or initialized
   */
  async loadPlugin<
    T extends PluginType,
    TInput = unknown,
    TOutput = unknown,
    TConfig extends Record<string, unknown> = Record<string, unknown>,
  >(
    name: string,
    pluginConfig: PluginConfig<T, TConfig>,
  ): Promise<PluginTypeMap<TInput, TOutput, TConfig>[T]> {
    const cached = this.pluginCache.get(name);
    if (cached && this.isCacheValid(cached.lastLoaded)) {
      // Cast the cached instance back to its specific plugin type with config
      // We need to use unknown as an intermediate step because the cache stores a more generic type
      return cached.instance as unknown as PluginTypeMap<
        TInput,
        TOutput,
        TConfig
      >[T] & {
        __config: PluginConfig<T, TConfig>;
      };
    }

    try {
      // Initialize Module Federation runtime
      await this.initModuleFederation(name, pluginConfig.url);

      // Load the remote module
      const container = (await loadRemote(`${name}/plugin`)) as
        | { default?: any }
        | any;
      if (!container) {
        throw new Error(
          `Failed to load plugin ${name}: Remote module not found`,
        );
      }

      // Get the plugin factory (handle both default and named exports)
      const Plugin = container.default || container;

      // Create instance
      const plugin = new Plugin() as PluginTypeMap<TInput, TOutput, TConfig>[T];

      // Initialize
      await plugin.initialize(pluginConfig.config);

      // Attach the config to the plugin instance for reloading
      const pluginWithConfig = Object.assign(plugin, {
        __config: pluginConfig,
      });

      // Store in cache with a more generic type to avoid type conflicts
      // The specific types are restored when retrieving from cache
      this.pluginCache.set(name, {
        instance: pluginWithConfig as BotPlugin<Record<string, unknown>> & {
          __config: PluginConfig<PluginType>;
        },
        lastLoaded: new Date(),
      });

      return plugin;
    } catch (error: any) {
      // Provide more specific error messages for common issues
      if (error.code === "ECONNREFUSED" || error.code === "ENOENT") {
        throw new Error(
          `Failed to load plugin ${name}: Could not connect to ${pluginConfig.url}. ` +
            `Make sure the plugin is accessible.`,
        );
      }
      console.error(`Failed to load plugin ${name}:`, error);
      throw error;
    }
  }

  /**
   * Checks if a cached plugin instance is still valid.
   *
   * @param lastLoaded - When the plugin was last loaded
   * @returns true if the cache is still valid, false if it needs to be reloaded
   * @private
   */
  private isCacheValid(lastLoaded: Date): boolean {
    const now = new Date();
    return now.getTime() - lastLoaded.getTime() < this.reloadIntervalMs;
  }

  /**
   * Clears all cached plugin instances.
   * This will force plugins to be reloaded on their next use.
   */
  clearCache(): void {
    this.pluginCache.clear();
  }

  /**
   * Reloads all cached plugins if any remote changes are detected.
   * This is useful for development when plugin implementations change.
   *
   * @throws {Error} If any plugin fails to reload
   */
  async reloadAll(): Promise<void> {
    const entries = Array.from(this.pluginCache.entries());
    const shouldReload = await revalidate();

    if (shouldReload) {
      this.pluginCache.clear();

      await Promise.all(
        entries.map(async ([name, cache]) => {
          const pluginConfig = cache.instance.__config;
          if (pluginConfig) {
            await this.loadPlugin(
              name,
              pluginConfig as PluginConfig<PluginType, Record<string, unknown>>,
            );
          }
        }),
      );
    }
  }

  /**
   * Gets the names of all currently loaded plugins.
   * @returns Array of plugin names that are currently loaded and cached
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.pluginCache.keys());
  }
}
