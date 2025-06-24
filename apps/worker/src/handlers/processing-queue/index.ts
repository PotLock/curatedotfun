import { QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { AppWorkerConfig } from "../../worker-lifecycle"; // Adjusted path
import { processingProcessor } from "./processor";

export const processingWorkerConfig: AppWorkerConfig<
  typeof QUEUE_NAMES.SUBMISSION_PROCESSING
> = {
  name: QUEUE_NAMES.SUBMISSION_PROCESSING,
  processor: processingProcessor,
  opts: {
    // Example: Concurrency setting for this specific worker
    // concurrency: 3,
  },
};
