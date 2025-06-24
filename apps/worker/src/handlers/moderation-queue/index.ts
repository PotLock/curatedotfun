import { QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { AppWorkerConfig } from "../../worker-lifecycle";
import { moderationProcessor } from "./processor";

export const moderationWorkerConfig: AppWorkerConfig<
  typeof QUEUE_NAMES.MODERATION
> = {
  name: QUEUE_NAMES.MODERATION,
  processor: moderationProcessor,
  opts: {
    concurrency: 1,
    maxStalledCount: 2,
    stalledInterval: 30000, // 30 second
  },
};
