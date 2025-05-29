import { Hono } from "hono";
import { Env } from "types/app";
import { activityRoutes } from "./activity";
import { configRoutes } from "./config";
import { feedsRoutes } from "./feeds";
import { pluginRoutes } from "./plugin";
import { statsRoutes } from "./stats";
import { submissionRoutes } from "./submission";
import { triggerRoutes } from "./trigger";
import { usersRoutes } from "./users";

// Create main API router
export const apiRoutes = new Hono<Env>();

// Mount sub-routers
apiRoutes.route("/submissions", submissionRoutes);
apiRoutes.route("/feeds", feedsRoutes);
apiRoutes.route("/config", configRoutes);
apiRoutes.route("/plugins", pluginRoutes);
apiRoutes.route("/stats", statsRoutes);
apiRoutes.route("/trigger", triggerRoutes);
apiRoutes.route("/users", usersRoutes);
apiRoutes.route("/activity", activityRoutes);
