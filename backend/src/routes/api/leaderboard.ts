import { Hono } from "hono";
import { Env } from "types/app";
import { leaderboardRepository } from "../../services/db/repositories";

// TODO: depreciate and combine with activity routes
const leaderboardRoutes = new Hono<Env>();

/**
 * Get the leaderboard data
 * @param timeRange - Optional time range filter: "all", "month", "week", "today"
 */
leaderboardRoutes.get("/", async (c) => {
  const timeRange = c.req.query("timeRange") || "all";
  const leaderboard = await leaderboardRepository.getLeaderboard(timeRange);
  return c.json(leaderboard);
});

export { leaderboardRoutes };
