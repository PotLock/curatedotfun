import { isProduction } from "../../services/config/config.service";
import { HonoApp } from "../../types/app";
import configRoutes from "./config";
import feedRoutes from "./feed";
import leaderboardRoutes from "./leaderboard";
import pluginRoutes from "./plugin";
import submissionRoutes from "./submission";
import { statsRoutes } from "./stats";
import { testRoutes } from "./test";
import twitterRoutes from "./twitter";

// Create main API router
export const apiRoutes = HonoApp();

// Test routes in development
if (!isProduction) {
  apiRoutes.route("/test", testRoutes);
}

// Mount sub-routers
apiRoutes.route("/twitter", twitterRoutes);
apiRoutes.route("/submissions", submissionRoutes);
apiRoutes.route("/feed", feedRoutes);
apiRoutes.route("/feeds", feedRoutes); // Alias for compatibility (TODO: Fix, combine into one)
apiRoutes.route("/config", configRoutes);
apiRoutes.route("/plugins", pluginRoutes);
apiRoutes.route("/leaderboard", leaderboardRoutes);
apiRoutes.route("/stats", statsRoutes);
