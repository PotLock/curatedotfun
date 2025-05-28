export { appContractRouter, type AppRouter } from "./routers";
export {
  activityContractRouter,
  type ActivityContractRouter,
  getGlobalStatsDefinition,
  getLeaderboardDefinition,
  getMyActivitiesDefinition,
  getUserActivitiesDefinition,
  getMyCuratedFeedsDefinition,
  getMyApprovedFeedsDefinition,
  getMyFeedRankDefinition,
} from "./routers/activity";
export {
  configContractRouter,
  type ConfigContractRouter,
  getFullConfigDefinition,
} from "./routers/config";
export {
  feedsContractRouter,
  type FeedsContractRouter,
  getAllFeedsDefinition,
  createFeedDefinition,
  getFeedByIdDefinition,
  getSubmissionsByFeedDefinition,
  updateFeedDefinition,
  processFeedDefinition,
} from "./routers/feeds";
export {
  pluginContractRouter,
  type PluginContractRouter,
  reloadPluginsDefinition,
} from "./routers/plugin";
export {
  statsContractRouter,
  type StatsContractRouter,
  getPlatformStatsDefinition,
} from "./routers/stats";
export {
  submissionContractRouter,
  type SubmissionContractRouter,
  getAllSubmissionsDefinition,
  getSubmissionByIdDefinition,
} from "./routers/submission";
export {
  triggerContractRouter,
  type TriggerContractRouter,
  triggerRecapJobDefinition,
  triggerIngestFeedDefinition,
} from "./routers/trigger";
export {
  usersContractRouter,
  type UsersContractRouter,
  getMyProfileDefinition,
  createUserProfileDefinition,
  updateUserProfileDefinition,
  deleteUserProfileDefinition,
} from "./routers/users";
export { publicProcedure, protectedProcedure, router } from "./trpc";
export type { Context } from "./trpc";
