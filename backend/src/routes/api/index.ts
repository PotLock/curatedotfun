import { isProduction } from "../../services/config/config.service";
import { HonoApp } from "../../types/app";
import configRoutes from "./config";
import exampleRoutes from "./example";
import feedRoutes from "./feed";
import feedExampleRoutes from "./feed-example";
import leaderboardRoutes from "./leaderboard";
import pluginRoutes from "./plugin";
import { statsRoutes } from "./stats";
import submissionRoutes from "./submission";
import { testRoutes } from "./test";
import triggerRoutes from "./trigger";
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
apiRoutes.route("/trigger", triggerRoutes);

// Example routes to demonstrate new validation middleware and DI container
if (!isProduction) {
  apiRoutes.route("/example", exampleRoutes);
  apiRoutes.route("/feed-example", feedExampleRoutes);
}
