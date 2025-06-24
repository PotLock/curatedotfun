import { Job } from "bullmq"; // Import Job
import { QUEUE_NAMES, JobData } from "@curatedotfun/shared-queue"; // Import JobData
import { ServiceProvider } from "@curatedotfun/core-services"; // Import ServiceProvider
import { logger } from "@curatedotfun/utils"; // Import logger

// Processor for the DEFAULT queue
export const defaultProcessor = async (
  job: Job<JobData<typeof QUEUE_NAMES.DEFAULT>, any, string>, // Use JobData
  sp: ServiceProvider, // Add ServiceProvider
) => {
  // Use logger instead of console.log
  logger.info(
    { jobData: job.data },
    `[Processor:DEFAULT] Received message: "${job.data.message}" at ${new Date(job.data.timestamp).toISOString()}`,
  );

  await new Promise((resolve) => setTimeout(resolve, 500));

  if (job.data.message.includes("fail")) {
    throw new Error('Simulated failure for message containing "fail"');
  }

  logger.info(`[Processor:DEFAULT] Successfully processed job ${job.id}`);
};
