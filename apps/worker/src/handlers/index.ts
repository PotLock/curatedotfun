import { defaultQueueConfig } from "./default-queue";
import { moderationWorkerConfig } from "./moderation-queue";
import { processingWorkerConfig } from "./processing-queue";
import { AppWorkerConfig } from "../worker-lifecycle";
// import { JobName } from "@curatedotfun/shared-queue"; // No longer needed here

export const workerConfigurations: AppWorkerConfig<any>[] = [ // Use any for the generic here
  defaultQueueConfig,
  moderationWorkerConfig,
  processingWorkerConfig,
];
