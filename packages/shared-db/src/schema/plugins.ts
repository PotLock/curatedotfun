import {
  jsonb,
  boolean as pgBoolean,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { timestamps } from "./common";

export const pluginTypeEnum = pgEnum("plugin_type", [
  "transformer",
  "distributor",
  "source",
  "rule",
  "outcome",
]);

export type PluginType = (typeof pluginTypeEnum.enumValues)[number];

// --- Plugins Table ---
// Stores metadata about available plugins that can be loaded by the Bot Worker.
export const plugins = pgTable("plugins", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "@curatedotfun/telegram", "@curatedotfun/ai-transform" // then it will go through getNormalizedName (utils) to get value
  type: pluginTypeEnum("type").notNull(), // 'transformer', 'distributor', 'source', 'rule', 'outcome'
  version: varchar("version", { length: 50 }).notNull(), // Semantic versioning, e.g., "1.0.2"
  description: text("description"),
  author: varchar("author", { length: 255 }),
  tags: jsonb("tags").$type<string[]>(), // e.g., ["social", "nlp", "twitter"]
  iconUrl: text("icon_url"),
  // entryPoint: URL or path to the plugin's remoteEntry.js for Module Federation
  entryPoint: text("entry_point").notNull(), // e.g., "pluginName@http://plugin-server.com/remoteEntry.js"
  // schemaDefinition: JSON schema for the plugin's specific configuration
  schemaDefinition: jsonb("schema_definition").$type<Record<string, any>>(),
  isPublic: pgBoolean("is_public").default(false).notNull(), // Whether the plugin is available to all users or restricted
  ...timestamps,
  // Unique constraint for name and version
  // _unique_name_version: unique().on(name, version), // Drizzle syntax for multi-column unique might vary or need index
});

export const insertPluginSchema = createInsertSchema(plugins);
export const updatePluginSchema = createUpdateSchema(plugins);
export const selectPluginSchema = createSelectSchema(plugins);
export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type UpdatePlugin = z.infer<typeof updatePluginSchema>;
export type RegisteredPlugin = z.infer<typeof selectPluginSchema>;
