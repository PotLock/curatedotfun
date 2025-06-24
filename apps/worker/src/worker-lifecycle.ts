import { Worker, Queue } from "bullmq";
import { workerConfigurations } from "./handlers"; // This will need to be updated later
import {
  createWorkerInstance,
  WorkerConfig,
  JobName,
  JobData,
} from "@curatedotfun/shared-queue";
import { ServiceProvider } from "@curatedotfun/core-services";
import { db } from "./db";
import { logger } from "@curatedotfun/utils";
import { Job, WorkerOptions } from "bullmq"; // Import Job and WorkerOptions

// Define a new type for our application-specific worker configurations
export interface AppWorkerConfig<T extends JobName> {
  name: T;
  processor: (job: Job<JobData<T>, any, string>, sp: ServiceProvider) => Promise<void>;
  opts?: Omit<WorkerOptions, "connection">; // Use Omit<WorkerOptions, "connection"> directly
}

export function initializeWorkers(sp: ServiceProvider): Worker<any>[] {
  const workers: Worker<any>[] = [];

  // workerConfigurations will be an array of AppWorkerConfig
  // The casting here will be removed once workerConfigurations is updated
  for (const config of workerConfigurations as AppWorkerConfig<any>[]) {
    // Adapt the AppWorkerConfig processor to the signature expected by createWorkerInstance
    const adaptedProcessor = (
      job: Job<JobData<any>, any, string>,
    ): Promise<void> => {
      return config.processor(job, sp);
    };

    const worker = createWorkerInstance(
      config.name,
      adaptedProcessor,
      config.opts as WorkerOptions | undefined,
    );

    // --- Common BullMQ Worker Event Listeners ---
    // These listeners apply to all workers created via this initializer
    worker.on("completed", (job) => {
      console.log(
        `[Event:Completed] Job ${job.id} on queue '${job.name}' finished.`,
      );
    });

    worker.on("failed", (job, err) => {
      console.error(
        `[Event:Failed] Job ${job?.id} on queue '${job?.name}' failed with error:`,
        err,
      );
    });

    worker.on("error", (err) => {
      console.error(
        `[Event:Error] Worker for queue '${worker.name}' experienced an unhandled error:`,
        err,
      );
    });

    worker.on("active", (job) => {
      console.log(
        `[Event:Active] Job ${job.id} on queue '${job.name}' is now active.`,
      );
    });

    worker.on("stalled", (jobId) => {
      console.warn(
        `[Event:Stalled] Job ${jobId} on queue '${worker.name}' stalled.`,
      );
    });

    workers.push(worker);
  }

  console.log(`Successfully initialized ${workers.length} BullMQ worker(s).`);
  return workers;
}

// --- Graceful Shutdown Logic (Crucial for production) ---
export async function gracefulShutdown(
  workers: Worker<any>[],
  queues: Queue<any>[],
): Promise<void> {
  console.log("Initiating graceful shutdown...");

  // Close all workers first to stop processing new jobs
  const workerClosePromises = workers.map((worker) => {
    console.log(`Closing worker for queue: ${worker.name}`);
    return worker.close();
  });
  await Promise.all(workerClosePromises);
  console.log("All workers have been closed.");

  // Then close all queues
  const queueClosePromises = queues.map((queue) => {
    console.log(`Closing queue: ${queue.name}`);
    return queue.close();
  });
  await Promise.all(queueClosePromises);
  console.log("All queues have been closed.");

  console.log("Application gracefully shut down.");
  process.exit(0);
}
