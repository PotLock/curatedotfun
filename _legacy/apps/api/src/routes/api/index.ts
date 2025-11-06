import { Hono } from "hono";
import { configRoutes } from "./config";
import { feedsRoutes } from "./feeds";
import { leaderboardRoutes } from "./leaderboard";
import { processingRoutes } from "./processing";
import { statsRoutes } from "./stats";
import { submissionRoutes } from "./submission";
import { testRoutes } from "./test";
import { triggerRoutes } from "./trigger";
import { twitterRoutes } from "./twitter";
import { Env } from "@/types/app";
import { usersRoutes } from "./users";
import { activityRoutes } from "./activity";
import { uploadRoutes } from "./upload";
import { pluginsRoutes } from "./plugins";
import { moderationRoutes } from "./moderation";
import { authRoutes } from "./auth";

// Create main API router
export const apiRoutes = new Hono<Env>();

// Test routes in development
if (process.env.NODE_URL !== "production") {
  apiRoutes.route("/test", testRoutes);
}

// Mount sub-routers
apiRoutes.route("/twitter", twitterRoutes);
apiRoutes.route("/submissions", submissionRoutes);
apiRoutes.route("/feeds", feedsRoutes);
apiRoutes.route("/config", configRoutes);
apiRoutes.route("/plugins", pluginsRoutes);
apiRoutes.route("/leaderboard", leaderboardRoutes);
apiRoutes.route("/stats", statsRoutes);
apiRoutes.route("/trigger", triggerRoutes);
apiRoutes.route("/users", usersRoutes);
apiRoutes.route("/activity", activityRoutes);
apiRoutes.route("/upload", uploadRoutes);
apiRoutes.route("/moderate", moderationRoutes);
apiRoutes.route("/auth", authRoutes);
apiRoutes.route("/processing", processingRoutes);
