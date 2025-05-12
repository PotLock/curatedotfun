import { isProduction } from "../../services/config/config.service";
import { HonoApp } from "../../types/app";
import configRoutes from "./config";
import feedRoutes from "./feed";
import leaderboardRoutes from "./leaderboard";
import pluginRoutes from "./plugin";
import { statsRoutes } from "./stats";
import submissionRoutes from "./submission";
import { testRoutes } from "./test";
import triggerRoutes from "./trigger";
import twitterRoutes from "./twitter";
import usersRoutes from "./users";

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
apiRoutes.route("/users", usersRoutes);
apiRoutes.route("/trigger", triggerRoutes);
