import { HonoApp } from "../../types/app";
import { db } from "../../services/db";

// Create leaderboard routes
const router = HonoApp();

/**
 * Get the leaderboard data
 * @param timeRange - Optional time range filter: "all", "month", "week", "today"
 */
router.get("/", async (c) => {
  const timeRange = c.req.query("timeRange") || "all";
  const leaderboard = db.getLeaderboard(timeRange);
  return c.json(leaderboard);
});

export default router;
