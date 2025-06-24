import { QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { AppWorkerConfig } from "../../worker-lifecycle";
import { defaultProcessor } from "./processor";

export const defaultQueueConfig: AppWorkerConfig<typeof QUEUE_NAMES.DEFAULT> = {
  name: QUEUE_NAMES.DEFAULT,
  processor: defaultProcessor,
  opts: {
    concurrency: 1,
    maxStalledCount: 2,
    stalledInterval: 30000, // 30 seconds
  },
};
