import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
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
  name: text("name").notNull().unique(),
  repoUrl: text("repo_url").notNull().unique(),
  entryPoint: text("entry_point").notNull(),
  type: pluginTypeEnum("type").notNull(),
  schemaDefinition: jsonb("schema_definition").$type<Record<string, any>>(),
  ...timestamps,
});

export const insertPluginSchema = createInsertSchema(plugins);
export const updatePluginSchema = createUpdateSchema(plugins);
export const selectPluginSchema = createSelectSchema(plugins);
export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type UpdatePlugin = z.infer<typeof updatePluginSchema>;
export type RegisteredPlugin = z.infer<typeof selectPluginSchema>;
