import { HonoApp } from "../../types/app";
import { PluginService } from "../../services/plugins/plugin.service";

// Create plugin routes
const router = HonoApp();

/**
 * Reload all plugins
 */
router.post("/reload", async (c) => {
  const pluginService = PluginService.getInstance();
  await pluginService.reloadAllPlugins();
  return c.json({ success: true });
});

export default router;
