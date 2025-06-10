import { SQLWrapper, and, desc, eq, or } from "drizzle-orm";
import {
  InsertPlugin,
  PluginType,
  RegisteredPlugin,
  plugins,
} from "../schema/plugins";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

export interface IPluginRepository {
  getPlugin: (pluginId: string) => Promise<RegisteredPlugin | undefined>;
  listPlugins: (filters?: PluginFilters) => Promise<RegisteredPlugin[]>;
  createPlugin: (data: InsertPlugin) => Promise<RegisteredPlugin>;
  updatePlugin: (
    pluginId: string,
    data: PluginUpdateData,
  ) => Promise<RegisteredPlugin | undefined>;
  deletePlugin: (pluginId: string) => Promise<RegisteredPlugin | undefined>;
}

export type PluginFilters = {
  type?: PluginType;
  name?: string;
};

export type PluginUpdateData = Partial<
  Omit<InsertPlugin, "id" | "createdAt" | "name" | "repoUrl">
>;

export class PluginRepository implements IPluginRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async getPlugin(pluginId: string): Promise<RegisteredPlugin | undefined> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(plugins)
            .where(eq(plugins.id, pluginId))
            .limit(1);

          return result[0];
        }, this.db),
      {
        operationName: "PluginRepository.getPlugin",
        additionalContext: { pluginId },
      },
    );
  }

  /**
   * Get a plugin by its identifier. The identifier can be either:
   * - Just the name (e.g. "@curatedotfun/telegram") to get the latest version
   * - Name@version (e.g. "@curatedotfun/telegram@1.0.0") to get a specific version
   */
  async getPluginByName(
    pluginName: string,
  ): Promise<RegisteredPlugin | undefined> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(plugins)
            .where(eq(plugins.name, pluginName))
            .limit(1);

          return result[0];
        }, this.db),
      {
        operationName: "PluginRepository.getPluginByName",
        additionalContext: { pluginName },
      },
    );
  }

  async listPlugins(filters: PluginFilters = {}): Promise<RegisteredPlugin[]> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const conditions: SQLWrapper[] = [];
          if (filters.type) {
            conditions.push(eq(plugins.type, filters.type));
          }
          if (filters.name) {
            conditions.push(eq(plugins.name, filters.name));
          }

          const query = dbInstance
            .select()
            .from(plugins)
            .where(and(...conditions))
            .orderBy(desc(plugins.name));

          return query;
        }, this.db),
      {
        operationName: "PluginRepository.listPlugins",
        additionalContext: { filters },
      },
    );
  }

  async createPlugin(data: InsertPlugin): Promise<RegisteredPlugin> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const existingPlugin = await dbInstance
            .select({ id: plugins.id })
            .from(plugins)
            .where(
              or(
                eq(plugins.name, data.name),
                eq(plugins.repoUrl, data.repoUrl),
              ),
            )
            .limit(1);

          if (existingPlugin.length > 0) {
            const err = new Error(
              `Plugin with name '${data.name}' or repository URL '${data.repoUrl}' already exists.`,
            );
            (err as any).code = "PLUGIN_ALREADY_EXISTS";
            throw err;
          }

          const newPlugin = await dbInstance
            .insert(plugins)
            .values(data)
            .returning();
          if (!newPlugin || newPlugin.length === 0) {
            throw new Error("Failed to register plugin");
          }
          return newPlugin[0];
        }, this.db),
      {
        operationName: "PluginRepository.createPlugin",
        additionalContext: { data },
      },
    );
  }

  async updatePlugin(
    pluginId: string,
    data: PluginUpdateData,
  ): Promise<RegisteredPlugin | undefined> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          if (Object.keys(data).length === 0) {
            return undefined;
          }
          const updatedPlugin = await dbInstance
            .update(plugins)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(plugins.id, pluginId))
            .returning();
          return updatedPlugin[0];
        }, this.db),
      {
        operationName: "PluginRepository.updatePlugin",
        additionalContext: { pluginId, data },
      },
    );
  }

  async deletePlugin(pluginId: string): Promise<RegisteredPlugin | undefined> {
    return withErrorHandling(
      async () =>
        executeWithRetry(async (dbInstance) => {
          const deletedPlugin = await dbInstance
            .delete(plugins)
            .where(eq(plugins.id, pluginId))
            .returning();
          return deletedPlugin[0];
        }, this.db),
      {
        operationName: "PluginRepository.deletePlugin",
        additionalContext: { pluginId },
      },
    );
  }

  /**
   * Parse a plugin identifier into name and version parts.
   * Examples:
   * - "@curatedotfun/telegram" -> ["@curatedotfun/telegram", undefined]
   * - "@curatedotfun/telegram@1.0.0" -> ["@curatedotfun/telegram", "1.0.0"]
   */
  //   private parsePluginIdentifier(
  //     identifier: string,
  //   ): [string, string | undefined] {
  //     const parts = identifier.split("@");
  //     if (parts.length === 1) {
  //       return [parts[0], undefined];
  //     }
  //     // Handle scoped packages (e.g. "@scope/name@version")
  //     if (parts[0] === "") {
  //       return [`@${parts[1]}`, parts[2]];
  //     }
  //     return [parts[0], parts[1]];
  //   }
}
