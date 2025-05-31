import { SubmissionRepository } from "@curatedotfun/shared-db";
import { Hono } from "hono";
import { Env } from "types/app";
import { ServiceProvider } from "../../utils/service-provider";

export const statsRoutes = new Hono<Env>();

/**
 * Get platform statistics (used by landing page)
 */
statsRoutes.get("/", async (c) => {
  const db = c.get("db");
  const submissionRepository = new SubmissionRepository(db);
  // Get posts count from database
  const postsCount = await submissionRepository.getPostsCount();

  // Get curators count from database
  const curatorsCount = await submissionRepository.getCuratorsCount();

  // Get other stats from config
  const feedService = ServiceProvider.getInstance().getFeedService();
  const allFeeds = await feedService.getAllFeeds(); // TODO: Optimize query (get count)
  const feedsCount = allFeeds.length;

  // Count total distributions from all feeds' distribute arrays
  let distributionsCount = 0;
  allFeeds.forEach((feed) => {
    const { config } = feed;
    // Count stream distributions if enabled
    if (config.outputs.stream?.enabled && config.outputs.stream.distribute) {
      distributionsCount += config.outputs.stream.distribute.length;
    }
  });

  return c.json({
    postsCount,
    feedsCount,
    curatorsCount,
    distributionsCount,
  });
});
