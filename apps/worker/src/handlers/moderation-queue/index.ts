import { QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { AppWorkerConfig } from "../../worker-lifecycle"; // Adjusted path
import { moderationProcessor } from "./processor";

export const moderationWorkerConfig: AppWorkerConfig<
  typeof QUEUE_NAMES.MODERATION
> = {
  name: QUEUE_NAMES.MODERATION,
  processor: moderationProcessor,
  opts: {
    // Example: Concurrency setting for this specific worker
    // concurrency: 5,
  },
};
