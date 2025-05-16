import { Hono } from "hono";
import { leaderboardRepository } from "../../services/db/repositories";
import { Env } from "types/app";

const router = new Hono<Env>();

/**
 * Get the leaderboard data
 * @param timeRange - Optional time range filter: "all", "month", "week", "today"
 */
router.get("/", async (c) => {
  const timeRange = c.req.query("timeRange") || "all";
  const leaderboard = await leaderboardRepository.getLeaderboard(timeRange);
  return c.json(leaderboard);
});

export default router;
