import { router } from "../trpc";
import { activityContractRouter } from "./activity";
import { configContractRouter } from "./config";
import { feedsContractRouter } from "./feeds";
import { pluginContractRouter } from "./plugin";
import { statsContractRouter } from "./stats";
import { submissionContractRouter } from "./submission";
import { triggerContractRouter } from "./trigger";
import { usersContractRouter } from "./users";

export const appContractRouter = router({
  activity: activityContractRouter,
  config: configContractRouter,
  feeds: feedsContractRouter,
  plugin: pluginContractRouter,
  stats: statsContractRouter,
  submission: submissionContractRouter,
  trigger: triggerContractRouter,
  users: usersContractRouter,
});

export type AppRouter = typeof appContractRouter;
