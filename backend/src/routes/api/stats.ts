import { HonoApp } from "../../types/app";
import { submissionRepository } from "../../services/db/repositories";

// Create stats routes
export const statsRoutes = HonoApp();

/**
 * Get platform statistics
 */
statsRoutes.get("/", async (c) => {
  const context = c.get("context");
  const config = context.configService.getConfig();

  // Get posts count from database
  const postsCount = await submissionRepository.getPostsCount();

  // Get curators count from database
  const curatorsCount = await submissionRepository.getCuratorsCount();

  // Get other stats from config
  const feedsCount = config.feeds.length;

  // Count total distributions from all feeds' distribute arrays
  let distributionsCount = 0;
  config.feeds.forEach((feed) => {
    // Count stream distributions if enabled
    if (feed.outputs.stream?.enabled && feed.outputs.stream.distribute) {
      distributionsCount += feed.outputs.stream.distribute.length;
    }

    // // Count recap distributions if enabled
    // if (feed.outputs.recap?.enabled && feed.outputs.recap.distribute) {
    //   distributionsCount += feed.outputs.recap.distribute.length;
    // }
  });

  return c.json({
    postsCount,
    feedsCount,
    curatorsCount,
    distributionsCount,
  });
});
