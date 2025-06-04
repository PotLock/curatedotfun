import {
  InsertPlugin,
  insertPluginSchema,
  PluginRepository,
  selectPluginSchema,
  updatePluginSchema,
} from "@curatedotfun/shared-db";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { db } from "../../db";
import { Env } from "../../types/app";

const pluginsRoutes = new Hono<Env>();
const pluginRepository = new PluginRepository(db);

// --- Register a new Plugin ---
pluginsRoutes.post(
  "/",
  zValidator(
    "json",
    insertPluginSchema.omit({ id: true, createdAt: true, updatedAt: true }),
  ),
  async (c) => {
    const pluginData = c.req.valid("json") as Omit<
      InsertPlugin,
      "id" | "createdAt" | "updatedAt"
    >;

    try {
      const newPlugin = await pluginRepository.createPlugin(pluginData);
      return c.json(newPlugin, 201);
    } catch (error: any) {
      if (error.code === "PLUGIN_ALREADY_EXISTS") {
        // TODO: Establish error codes
        throw new HTTPException(409, { message: error.message });
      }
      console.error("Error registering plugin:", error);
      throw new HTTPException(500, { message: "Failed to register plugin" });
    }
  },
);

// --- Get a specific Plugin by ID ---
pluginsRoutes.get(
  "/:pluginId",
  zValidator("param", z.object({ pluginId: z.string().uuid() })),
  async (c) => {
    const { pluginId } = c.req.valid("param");
    const plugin = await pluginRepository.getPlugin(pluginId);

    if (!plugin) {
      throw new HTTPException(404, { message: "Plugin not found" });
    }
    return c.json(plugin);
  },
);

// --- Get a specific Plugin by identifier (name or name@version) ---
pluginsRoutes.get(
  "/by-identifier/:identifier",
  zValidator("param", z.object({ identifier: z.string() })),
  async (c) => {
    const { identifier } = c.req.valid("param");
    const plugin = await pluginRepository.getPlugin(identifier);

    if (!plugin) {
      throw new HTTPException(404, {
        message: `Plugin '${identifier}' not found`,
      });
    }
    return c.json(plugin);
  },
);

// --- List Plugins (filter by type, tags, isPublic) ---
pluginsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      type: selectPluginSchema.shape.type.optional(),
      tag: z.string().optional(),
      isPublic: z.boolean().optional(),
      latestVersionsOnly: z.boolean().optional().default(false),
    }),
  ),
  async (c) => {
    const { type, tag, isPublic, latestVersionsOnly } = c.req.valid("query");

    const filters: any = {};
    if (type) filters.type = type;
    if (tag) filters.tags = tag.split(",").map((t) => t.trim());
    if (isPublic !== undefined) filters.isPublic = isPublic;

    const result = await pluginRepository.listPlugins(
      filters,
      latestVersionsOnly,
    );
    return c.json(result);
  },
);

// --- Update a Plugin (e.g., description, tags, entryPoint for a specific version) ---
pluginsRoutes.patch(
  "/:pluginId",
  zValidator("param", z.object({ pluginId: z.string().uuid() })),
  zValidator(
    "json",
    updatePluginSchema.partial().omit({
      id: true,
      createdAt: true,
      name: true,
      version: true,
      type: true,
    }),
  ), // Name, version, type usually immutable
  async (c) => {
    const { pluginId } = c.req.valid("param");
    const updateData = c.req.valid("json");

    if (Object.keys(updateData).length === 0) {
      throw new HTTPException(400, { message: "No update data provided" });
    }

    const updatedPlugin = await pluginRepository.updatePlugin(
      pluginId,
      updateData,
    );

    if (!updatedPlugin) {
      throw new HTTPException(404, {
        message: "Plugin not found or failed to update",
      });
    }
    return c.json(updatedPlugin);
  },
);

// --- Delete a Plugin (specific version by ID) ---
// Consider implications: if a plugin version is in use, deletion might be problematic.
pluginsRoutes.delete(
  "/:pluginId",
  zValidator("param", z.object({ pluginId: z.string().uuid() })),
  async (c) => {
    const { pluginId } = c.req.valid("param");

    // TODO: Check if this plugin version is part of any active RulesConfiguration.
    // If so, prevent deletion or require force flag.

    const deletedPlugin = await pluginRepository.deletePlugin(pluginId);

    if (!deletedPlugin) {
      throw new HTTPException(404, {
        message: "Plugin not found or failed to delete",
      });
    }
    return c.json({
      message: "Plugin deleted successfully",
      plugin: deletedPlugin,
    });
  },
);

pluginsRoutes.post("/reload", async (c) => {
  const sp = c.get("sp");
  const pluginService = sp.getPluginService();
  await pluginService.reloadAllPlugins();
  return c.json({ success: true });
});

export { pluginsRoutes };
