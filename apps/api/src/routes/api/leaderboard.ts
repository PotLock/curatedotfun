import { LeaderboardRepository } from "@curatedotfun/shared-db";
import { Hono } from "hono";
import { Env } from "types/app";

// TODO: depreciate and combine with activity routes
const leaderboardRoutes = new Hono<Env>();

/**
 * Get the leaderboard data
 * @param timeRange - Optional time range filter: "all", "month", "week", "today"
 */
leaderboardRoutes.get("/", async (c) => {
  const db = c.get("db");
  const leaderboardRepository = new LeaderboardRepository(db);
  const timeRange = c.req.query("timeRange") || "all";
  const leaderboard =
    await leaderboardRepository.getCuratorStatsLeaderboard(timeRange);
  return c.json(leaderboard);
});

export { leaderboardRoutes };
