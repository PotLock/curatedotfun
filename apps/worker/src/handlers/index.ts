import { defaultQueueConfig } from "./default-queue";
import { moderationWorkerConfig } from "./moderation-queue";
import { processingWorkerConfig } from "./processing-queue";
import { AppWorkerConfig } from "../worker-lifecycle";

export const workerConfigurations: AppWorkerConfig<any>[] = [
  defaultQueueConfig,
  moderationWorkerConfig,
  processingWorkerConfig,
];
