import { HonoApp } from "../../types/app";
import { db } from "../../services/db";

// Create stats routes
export const statsRoutes = HonoApp();

/**
 * Get platform statistics
 */
statsRoutes.get("/", async (c) => {
  const context = c.get("context");
  const config = context.configService.getConfig();

  // Get posts count from database
  const postsCount = db.getPostsCount();

  // Get curators count from database
  const curatorsCount = db.getCuratorsCount();

  // Get other stats from config
  const feedsCount = config.feeds.length;

  // Count unique distributions from config
  const distributionPlugins = Object.values(config.plugins).filter(
    (plugin) => plugin.type === "distributor",
  );
  const distributionsCount = distributionPlugins.length;

  return c.json({
    postsCount,
    feedsCount,
    curatorsCount,
    distributionsCount,
  });
});
