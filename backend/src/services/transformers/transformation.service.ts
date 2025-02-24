import { Plugin, PluginModule } from "types/plugin";
import { PluginConfig, PluginsConfig } from "../../types/config";
import { logger } from "../../utils/logger";

export class TransformationService {
  private plugins: Map<string, Plugin> = new Map();

  async initialize(config: PluginsConfig): Promise<void> {
    // Load all plugins
    for (const [name, pluginConfig] of Object.entries(config)) {
      try {
        await this.loadPlugin(name, pluginConfig);
      } catch (error) {
        logger.error(`Failed to load plugin ${name}:`, error);
      }
    }
  }

  private async loadPlugin(name: string, config: PluginConfig): Promise<void> {
    try {
      // Dynamic import of plugin from URL
      const module = (await import(config.url)) as PluginModule;
      const plugin = new module.default();

      // Store the plugin instance
      this.plugins.set(name, plugin);

      logger.info(`Successfully loaded plugin: ${name}`);
    } catch (error) {
      logger.error(`Error loading plugin ${name}:`, error);
      throw error;
    }
  }

  // async transformContent(
  //   pluginName: string,
  //   content: string,
  //   config: { prompt: string },
  // ): Promise<string> {
  //   const plugin = this.plugins.get(pluginName);
  //   if (!plugin || !("transform" in plugin)) {
  //     throw new Error(`Transformer plugin ${pluginName} not found or invalid`);
  //   }

  //   try {
  //     await plugin.initialize(config);
  //     return await plugin.transform(content);
  //   } catch (error) {
  //     logger.error(
  //       `Error transforming content with plugin ${pluginName}:`,
  //       error,
  //     );
  //     throw error;
  //   }
  // }

  async shutdown(): Promise<void> {
    // Shutdown all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        if (plugin.shutdown) {
          await plugin.shutdown();
        }
      } catch (error) {
        logger.error(`Error shutting down plugin ${name}:`, error);
      }
    }
    this.plugins.clear();
  }
}
