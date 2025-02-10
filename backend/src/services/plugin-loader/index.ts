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
 */
export class PluginLoader {
  /**
   * Cache for loaded plugin instances.
   * @private
   */
  private pluginCache: Map<
    string,
    PluginCache<PluginType, BotPlugin<Record<string, unknown>>>
  > = new Map();

  /**
   * Time in milliseconds before cached plugins are considered stale.
   * @private
   */
  private reloadIntervalMs: number;

  /**
   * Creates a new PluginLoader instance.
   * @param reloadInterval - Time in milliseconds before cached plugins are reloaded (default: 5 minutes)
   */
  constructor(reloadInterval: number = 5 * 60 * 1000) {
    this.reloadIntervalMs = reloadInterval;
  }

  /**
   * Initializes Module Federation for a plugin.
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
      return cached.instance as unknown as PluginTypeMap<
        TInput,
        TOutput,
        TConfig
      >[T] & {
        __config: PluginConfig<T, TConfig>;
      };
    }

    try {
      await this.initModuleFederation(name, pluginConfig.url);

      const container = (await loadRemote(`${name}/plugin`)) as
        | { default?: any }
        | any;
      if (!container) {
        throw new Error(
          `Failed to load plugin ${name}: Remote module not found`,
        );
      }

      const Plugin = container.default || container;
      const plugin = new Plugin() as PluginTypeMap<TInput, TOutput, TConfig>[T];
      await plugin.initialize(pluginConfig.config);

      const pluginWithConfig = Object.assign(plugin, {
        __config: pluginConfig,
      });

      this.pluginCache.set(name, {
        instance: pluginWithConfig as BotPlugin<Record<string, unknown>> & {
          __config: PluginConfig<PluginType>;
        },
        lastLoaded: new Date(),
      });

      return plugin;
    } catch (error: any) {
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
   * @private
   */
  private isCacheValid(lastLoaded: Date): boolean {
    const now = new Date();
    return now.getTime() - lastLoaded.getTime() < this.reloadIntervalMs;
  }

  /**
   * Clears all cached plugin instances.
   */
  clearCache(): void {
    this.pluginCache.clear();
  }

  /**
   * Reloads all cached plugins if any remote changes are detected.
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
}
