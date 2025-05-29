import type { AppRouter } from "@curatedotfun/api-contract";
import { router } from "@curatedotfun/api-contract";
import { activityRouter } from "./activity";
import { feedsRouter } from "./feeds";
import { pluginRouter } from "./plugin";
import { statsRouter } from "./stats";
import { submissionRouter } from "./submission";
import { triggerRouter } from "./trigger";
import { usersRouter } from "./users";

export const appRouter: AppRouter = router({
  activity: activityRouter,
  feeds: feedsRouter,
  plugin: pluginRouter,
  stats: statsRouter,
  submission: submissionRouter,
  trigger: triggerRouter,
  users: usersRouter,
});
