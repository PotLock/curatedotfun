# Configuration Management & Database Migration Recommendations

This document details recommendations for migrating application configurations from the `curate.config.json` file to the PostgreSQL database, and refactoring `ConfigService` accordingly.

## 1. Goal

The primary goal is to store all configurations (global settings, plugin registrations, and feed configurations) within the database. This allows for:

*   Dynamic updates to configurations without redeploying the application.
*   Granular access control to different parts of the configuration using RBAC.
*   A single source of truth for all configurations.
*   Easier management of configurations across different environments (dev, staging, prod) if the database is the source.

`FeedConfig` is already stored in the `feeds.config` JSONB column. This section focuses on `AppConfig.global` and `AppConfig.plugins`.

## 2. Database Schema Design for Global and Plugin Configurations

New tables will be needed to store global settings and plugin registrations.

### 2.1. `global_settings` Table

This table can store key-value pairs for global settings.

```sql
-- Example Drizzle Schema for global_settings
CREATE TABLE global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

*   **`key`**: The name of the global setting (e.g., "botId", "defaultStatus", "maxDailySubmissionsPerUser", "blacklist_twitter", "blacklist_all").
*   **`value`**: The setting's value, stored as JSONB to accommodate different data types (string, number, array, object).
    *   For "blacklist", the key could be "blacklist_all" or "blacklist_twitter", and the value would be a JSON array of strings.
*   **`description`**: Optional description of the setting.

**Drizzle Schema (`global_settings.schema.ts`):**

```typescript
// backend/src/services/db/schema/global_settings.ts
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const globalSettingsTable = pgTable("global_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type GlobalSetting = typeof globalSettingsTable.$inferSelect;
export type NewGlobalSetting = typeof globalSettingsTable.$inferInsert;
```

### 2.2. `plugin_registrations` Table

This table will store the registration details for each plugin.

```sql
-- Example Drizzle Schema for plugin_registrations
CREATE TABLE plugin_registrations (
    name TEXT PRIMARY KEY, -- Plugin name, e.g., "@curatedotfun/twitter-source"
    type TEXT NOT NULL, -- 'source', 'transformer', 'distributor'
    url TEXT NOT NULL, -- URL for Module Federation
    default_config JSONB, -- Optional: Default static config for the plugin instance
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

*   **`name`**: The unique name/key of the plugin.
*   **`type`**: Enum ('source', 'transformer', 'distributor').
*   **`url`**: The remote entry URL for Module Federation.
*   **`default_config`**: Optional JSONB for any static/default configuration associated with the plugin's registration (from `PluginRegistrationConfigSchema.config`).
*   **`description`**: Optional description.

**Drizzle Schema (`plugin_registrations.schema.ts`):**

```typescript
// backend/src/services/db/schema/plugin_registrations.ts
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod"; // For enum

// Re-use or define plugin type enum
export const PluginTypeEnum = z.enum(["transformer", "distributor", "source"]);

export const pluginRegistrationsTable = pgTable("plugin_registrations", {
  name: text("name").primaryKey(),
  type: text("type").notNull().$type<z.infer<typeof PluginTypeEnum>>(), // Ensure this matches Zod enum
  url: text("url").notNull(),
  defaultConfig: jsonb("default_config"), // Corresponds to PluginRegistrationConfig.config
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PluginRegistration = typeof pluginRegistrationsTable.$inferSelect;
export type NewPluginRegistration = typeof pluginRegistrationsTable.$inferInsert;
```
**Note**: Remember to add these new schema files to `backend/src/services/db/schema.ts` exports and generate migrations.

## 3. Refactoring `ConfigService`

`ConfigService` needs to be refactored to fetch its data from these new database tables instead of `curate.config.json`.

### 3.1. Dependencies:

*   Inject repositories for `global_settings` and `plugin_registrations`.
    *   Create `GlobalSettingsRepository` and `PluginRegistrationRepository`.
*   The `ConfigService` might no longer need to be a traditional singleton if its state (the config) is fetched on demand or cached from the DB. `ServiceProvider` can manage its instance.

### 3.2. Modified Methods:

*   **`constructor(globalSettingsRepo, pluginRegistrationRepo, feedRepo)`**:
    *   Store injected repositories.
*   **`async loadConfig(): Promise<AppConfig>`**:
    *   This method will now be responsible for fetching all configuration components from the database and assembling the `AppConfig` object.
    *   Fetch all global settings from `globalSettingsRepo` and structure them into the `global` part of `AppConfig`.
        *   Example: `botId: (await globalSettingsRepo.getSetting('botId')).value as string`.
        *   Blacklists might need special handling to combine platform-specific and "all" blacklists.
    *   Fetch all plugin registrations from `pluginRegistrationRepo` and structure them into the `plugins` record of `AppConfig`.
    *   Fetch all feed configurations from `feedRepo.getAllFeeds()` (this part is similar to current, as `FeedConfig` is already in `feeds.config`).
    *   The assembled `AppConfig` object can be cached in memory within `ConfigService` with a configurable TTL or an invalidation mechanism if dynamic updates are frequent.
    *   The concept of `hydrateConfigValues` might still be relevant if some DB-stored values contain placeholders that need to be resolved with environment variables at runtime, though it's generally better if DB-stored config is fully resolved.
*   **`getConfig(): AppConfig`**:
    *   Returns the cached `AppConfig`. If not cached or stale, it could trigger a reload from the DB.
*   **`getPluginRegistry(): PluginsConfig` and `getPluginByName(pluginName: string)`**:
    *   Will operate on the `plugins` part of the DB-loaded (and potentially cached) `AppConfig`.
*   **`getFeedConfig(feedId: string)`**:
    *   Will operate on the `feeds` part of the DB-loaded (and potentially cached) `AppConfig`.
*   **Removal of File System Logic**:
    *   Methods like `setConfigPath`, `getRawConfig`, and file reading logic will be removed.

### 3.3. `ConfigService` Structure (Conceptual):

```typescript
// backend/src/services/config.service.ts (Conceptual Refactor)
import { AppConfig, FeedConfig, GlobalConfig, PluginRegistrationConfig, PluginsConfig } from "../types/config.zod"; // Assuming zod types are still primary
import { FeedRepository } from "./db/repositories/feed.repository";
import { GlobalSettingsRepository } from "./db/repositories/globalSettings.repository"; // New
import { PluginRegistrationRepository } from "./db/repositories/pluginRegistration.repository"; // New
import { logger } from "../utils/logger";
// import { hydrateConfigValues } from "../utils/config"; // May or may not be needed

export class ConfigService {
  private appConfig: AppConfig | null = null;
  private lastLoaded: Date | null = null;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes, configurable

  constructor(
    private globalSettingsRepo: GlobalSettingsRepository,
    private pluginRegRepo: PluginRegistrationRepository,
    private feedRepo: FeedRepository,
    // Potentially other dependencies like a cache service
  ) {}

  // No longer a singleton getInstance, ServiceProvider will manage it.

  public async loadConfig(forceReload: boolean = false): Promise<AppConfig> {
    if (!forceReload && this.appConfig && this.lastLoaded && (Date.now() - this.lastLoaded.getTime()) < this.cacheTTL) {
      logger.debug("Returning cached AppConfig");
      return this.appConfig;
    }

    logger.info("Loading AppConfig from database...");
    try {
      // 1. Fetch Global Settings
      const globalSettingsFromDb = await this.globalSettingsRepo.getAllSettings();
      const globalConf: Partial<GlobalConfig> = { blacklist: {} }; // Initialize blacklist
      for (const setting of globalSettingsFromDb) {
        if (setting.key.startsWith("blacklist_")) {
          const platform = setting.key.substring("blacklist_".length);
          globalConf.blacklist![platform] = setting.value as string[];
        } else {
          (globalConf as any)[setting.key] = setting.value;
        }
      }
      // Add type assertion or proper mapping for GlobalConfig

      // 2. Fetch Plugin Registrations
      const pluginRegsFromDb = await this.pluginRegRepo.getAllRegistrations();
      const pluginsConf: PluginsConfig = {};
      for (const reg of pluginRegsFromDb) {
        pluginsConf[reg.name] = {
          type: reg.type as "transformer" | "distributor" | "source", // Ensure type assertion
          url: reg.url,
          config: reg.defaultConfig || undefined, // Handle null defaultConfig
        };
      }

      // 3. Fetch Feed Configurations
      const feedsFromDb = await this.feedRepo.getAllFeeds(); // Assuming this returns { id, name, description, config: FeedConfig }[]
      const feedConfigs: FeedConfig[] = feedsFromDb.map(f => f.config as FeedConfig); // Extract FeedConfig

      const loadedAppConfig: AppConfig = {
        global: globalConf as GlobalConfig, // Ensure type safety
        plugins: pluginsConf,
        feeds: feedConfigs,
      };
      
      // Optional: Hydration if still needed
      // this.appConfig = hydrateConfigValues(loadedAppConfig);
      this.appConfig = loadedAppConfig;
      this.lastLoaded = new Date();
      logger.info("AppConfig loaded successfully from database.");
      return this.appConfig;
    } catch (error) {
      logger.error("Failed to load AppConfig from database:", error);
      // Fallback or error handling strategy:
      // - Throw error and prevent app startup?
      // - Use a stale cache if available?
      // - Load from a backup file (less ideal if DB is source of truth)?
      throw new Error(`Failed to load config from database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async getConfig(): Promise<AppConfig> { // Now async as it might load
    if (!this.appConfig || !this.lastLoaded || (Date.now() - this.lastLoaded.getTime()) >= this.cacheTTL) {
      return this.loadConfig(true); // Force reload if cache is invalid or missing
    }
    return this.appConfig;
  }

  // getFeedConfig, getPluginByName etc. would operate on the result of (await this.getConfig())
  public async getFeedConfig(feedId: string): Promise<FeedConfig | undefined> {
    const config = await this.getConfig();
    return config.feeds.find(feed => feed.id.toLowerCase() === feedId.toLowerCase());
  }
  
  public async getPluginByName(pluginName: string): Promise<PluginRegistrationConfig | undefined> {
    const config = await this.getConfig();
    return config.plugins[pluginName];
  }

  // Method to invalidate cache, e.g., after a config update
  public invalidateCache(): void {
    this.appConfig = null;
    this.lastLoaded = null;
    logger.info("AppConfig cache invalidated.");
  }
}
```

## 4. Seeding and Bootstrapping

*   **Initial Seed**: A script (e.g., `scripts/seed-db-config.ts`) will be needed to populate the `global_settings` and `plugin_registrations` tables with initial default values, perhaps read from a JSON file (like the current `curate.config.json`) or hardcoded for a first run. This script would use the new repositories.
*   **Migrations**: Drizzle migrations will create the new tables. The seed script would run after migrations.

## 5. Dynamic Updates & Caching

*   **API Endpoints**: New API endpoints (secured by RBAC, see `rbac_recommendations.md`) will be required to allow authorized users to update settings in `global_settings` and `plugin_registrations`, and potentially `feeds.config`.
*   **Cache Invalidation**: When a configuration is updated via an API, `ConfigService.invalidateCache()` should be called to ensure that the next call to `getConfig()` fetches the fresh configuration from the database.
*   **Alternative Caching**: Consider using a more robust caching solution (e.g., Redis) if the application is distributed across multiple instances, to ensure cache consistency. For a single instance, in-memory caching with TTL and invalidation is a good start.

## 6. Impact on Other Services

*   **`ServiceProvider`**: Will need to be updated to inject the new repositories into `ConfigService` and to manage the (potentially non-singleton) `ConfigService` instance.
*   **Services Consuming Config**: Any service that currently gets `ConfigService.getInstance().getConfig()` synchronously will need to adapt if `getConfig()` becomes asynchronous (e.g., `await configService.getConfig()`). This is a significant change. If `ConfigService.loadConfig()` is called at application startup and caches the config, synchronous access might still be possible, but this makes dynamic updates harder to propagate without restarting or a more complex cache refresh mechanism. The conceptual refactor above makes `getConfig` async.
*   **`PluginService`**: Currently gets `pluginMeta` from `ConfigService`. This interaction will remain, but `ConfigService` will source it from the DB.

## 7. Transition Strategy

1.  **Develop Schemas & Repositories**: Create the Drizzle schemas for `global_settings` and `plugin_registrations`, and their corresponding repositories.
2.  **Refactor `ConfigService`**: Implement the new `ConfigService` logic to fetch from these repositories. Initially, it can still load `FeedConfig` from the existing `feeds` table.
3.  **Seed Script**: Create the script to seed initial global and plugin configurations.
4.  **Update `ServiceProvider`**: Adjust `ServiceProvider` to instantiate the new `ConfigService` with its repository dependencies.
5.  **Adapt Consumers**: Modify services that consume `ConfigService` to handle asynchronous `getConfig()` if that pattern is adopted, or ensure `loadConfig()` is called appropriately at startup if synchronous access is maintained.
6.  **API for Updates (Later)**: Develop API endpoints for managing these configurations once the read path is stable.
7.  **RBAC (Later)**: Secure these new API endpoints with RBAC.

This migration will centralize configuration management, making the system more flexible and prepared for secure, dynamic updates.
