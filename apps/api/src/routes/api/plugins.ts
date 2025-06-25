import {
  InsertPlugin,
  insertPluginSchema,
  PluginRepository,
  selectPluginSchema,
  updatePluginSchema,
} from "@curatedotfun/shared-db";
import { AppErrorCode, ServiceError } from "@curatedotfun/utils";
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
    const pluginData = c.req.valid("json");

    try {
      const newPlugin = await pluginRepository.createPlugin(pluginData);
      return c.json(newPlugin, 201);
    } catch (error: unknown) {
      console.error("Error registering plugin:", { error, pluginData });
      if (
        error instanceof ServiceError &&
        error.errorCode === AppErrorCode.RESOURCE_CONFLICT
      ) {
        throw new HTTPException(409, { message: error.message });
      }
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

// --- List Plugins (filter by type and name) ---
pluginsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      type: selectPluginSchema.shape.type.optional(),
      name: z.string().optional(),
    }),
  ),
  async (c) => {
    const { type, name } = c.req.valid("query");

    const filters: any = {};
    if (type) filters.type = type;
    if (name) filters.name = name;

    const result = await pluginRepository.listPlugins(filters);
    return c.json(result);
  },
);

// --- Update a Plugin (e.g., entryPoint, schemaDefinition) ---
pluginsRoutes.patch(
  "/:pluginId",
  zValidator("param", z.object({ pluginId: z.string().uuid() })),
  zValidator(
    "json",
    updatePluginSchema.partial().omit({
      id: true,
      createdAt: true,
      name: true,
      repoUrl: true,
    }),
  ),
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

// --- Delete a Plugin ---
pluginsRoutes.delete(
  "/:pluginId",
  zValidator("param", z.object({ pluginId: z.string().uuid() })),
  async (c) => {
    const { pluginId } = c.req.valid("param");

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
