import { Hono } from "hono";
import { Env } from "types/app";
import { PluginService } from "../../services/plugin.service";

const pluginRoutes = new Hono<Env>();

/**
 * Reload all plugins
 */
pluginRoutes.post("/reload", async (c) => {
  const pluginService = PluginService.getInstance();
  await pluginService.reloadAllPlugins();
  return c.json({ success: true });
});

export { pluginRoutes };
