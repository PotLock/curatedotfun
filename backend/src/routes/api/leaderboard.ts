import { HonoApp } from "../../types/app";
import { leaderboardRepository } from "../../services/db/repositories";

// Create leaderboard routes
const router = HonoApp();

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
