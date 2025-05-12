import { Hono } from "hono";
import { PluginService } from "../../services/plugins/plugin.service";
import { Env } from "types/app";

const router = new Hono<Env>();

/**
 * Reload all plugins
 */
router.post("/reload", async (c) => {
  const pluginService = PluginService.getInstance();
  await pluginService.reloadAllPlugins();
  return c.json({ success: true });
});

export default router;
