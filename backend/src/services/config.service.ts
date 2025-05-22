import fs from "fs/promises";
import path from "path";
import {
  AppConfig,
  FeedConfig,
  PluginConfig,
  PluginsConfig,
} from "../types/config.zod";
import { hydrateConfigValues } from "../utils/config";
import { logger } from "../utils/logger";

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";
export const isStaging = process.env.RAILWAY_ENVIRONMENT_NAME === "staging";

console.log(
  "Using environment: ",
  process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
);
export class ConfigService {
  private config: AppConfig | null = null;
  private configPath: string;

  public constructor() {
    if (!isProduction) {
      this.configPath = path.resolve(
        process.cwd(),
        "test/curate.config.test.json",
      );
    } else {
      // Production environment
      this.configPath = path.resolve(process.cwd(), "../curate.config.json");
    }

    logger.info(`Using configuration from: ${this.configPath}`);
  }

  public async loadConfig(): Promise<AppConfig> {
    try {
      const rawConfig = await this.getRawConfig();
      const hydratedConfig = hydrateConfigValues(rawConfig);
      this.config = hydratedConfig;
      return hydratedConfig;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load config: ${message}`);
    }
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    return this.config;
  }

  public setConfigPath(path: string): void {
    this.configPath = path;
  }

  public async getRawConfig(): Promise<AppConfig> {
    try {
      const configFile = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(configFile) as AppConfig;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load raw config: ${message}`);
    }
  }

  public getPluginRegistry(): PluginsConfig {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    const config = this.getConfig();
    return config.plugins;
  }

  public getPluginByName(pluginName: string): PluginConfig | undefined {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    const plugins = this.getPluginRegistry();
    return plugins[pluginName];
  }

  public getFeedConfig(feedId: string): FeedConfig | undefined {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }
    const config = this.getConfig();
    return config.feeds.find(
      (feed) => feed.id.toLowerCase() === feedId.toLowerCase(),
    );
  }
}
