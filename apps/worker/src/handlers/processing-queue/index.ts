import { QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { AppWorkerConfig } from "../../worker-lifecycle";
import { processingProcessor } from "./processor";

export const processingWorkerConfig: AppWorkerConfig<
  typeof QUEUE_NAMES.SUBMISSION_PROCESSING
> = {
  name: QUEUE_NAMES.SUBMISSION_PROCESSING,
  processor: processingProcessor,
  opts: {
    concurrency: 1,
  },
};
