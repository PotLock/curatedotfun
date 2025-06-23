import { QUEUE_NAMES, WorkerConfig, JobName } from '@curatedotfun/shared-queue';
import { defaultProcessor } from './processor';

export const defaultQueueConfig: WorkerConfig<JobName> = {
  name: QUEUE_NAMES.DEFAULT,
  processor: defaultProcessor,
  opts: {
    concurrency: 1,
    maxStalledCount: 2,
    stalledInterval: 30000, // 30 seconds
    // @ts-expect-error connection gets set later, via createWorkerInstance in shared-queue
    connection: null
  },
};
