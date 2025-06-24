import { Job } from "bullmq";
import { QUEUE_NAMES, JobData } from "@curatedotfun/shared-queue";
import { ServiceProvider } from "@curatedotfun/core-services";
import { logger } from "@curatedotfun/utils";

// Processor for the DEFAULT queue
export const defaultProcessor = async (
  job: Job<JobData<typeof QUEUE_NAMES.DEFAULT>, any, string>,
  sp: ServiceProvider,
) => {
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
