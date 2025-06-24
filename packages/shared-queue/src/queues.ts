import { Job, Queue, Worker, Processor } from "bullmq";

export const QUEUE_NAMES = {
  MODERATION: "moderation",
  SUBMISSION_PROCESSING: "submission-processing",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface JobPayloads {
  [QUEUE_NAMES.MODERATION]: {
    submissionId: string;
    feedId: string;
    action: "approve" | "reject";
    moderatorAccountId: string;
    moderatorAccountIdType: "near" | "platform_username";
    source: "ui" | "auto_approval" | "super_admin_direct";
    note?: string | null;
  };
  [QUEUE_NAMES.SUBMISSION_PROCESSING]: {
    submissionId: string;
    feedId: string;
  };
}

export type JobName = keyof JobPayloads;

export type JobData<T extends JobName> = JobPayloads[T];

export type WorkerProcessor<T extends JobName> = (
  job: Job<JobData<T>, any, string>,
) => Promise<void>;

export interface WorkerConfig<T extends JobName> {
  name: T;
  processor: WorkerProcessor<T>;
  // Optional: Allows passing specific BullMQ Worker options per worker
  opts?: Omit<ConstructorParameters<typeof Worker>[2], "connection">;
}

export const getRedisConnection = () => ({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
});

export function createQueue<T extends JobName>(name: T): Queue<JobData<T>> {
  return new Queue<JobData<T>>(name, { connection: getRedisConnection() });
}

export function createWorkerInstance<T extends JobName>(
  name: T,
  processor: Processor<JobData<T>, any, string>,
  opts?: ConstructorParameters<typeof Worker>[2],
): Worker<JobData<T>, any, string> {
  return new Worker<JobData<T>>(name, processor, {
    connection: getRedisConnection(),
    ...opts, // Merge in any specific options for this worker
  });
}
