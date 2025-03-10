import { HonoApp } from "../../types/app";
import { db } from "../../services/db";

// Create leaderboard routes
const router = HonoApp();

/**
 * Get the leaderboard data
 */
router.get("/", async (c) => {
  const leaderboard = db.getLeaderboard();
  return c.json(leaderboard);
});

export default router;
