import { QUEUE_NAMES, WorkerProcessor } from '@curatedotfun/shared-queue';

// Processor for the DEFAULT queue
const defaultProcessor: WorkerProcessor<typeof QUEUE_NAMES.DEFAULT> = async (job) => {
  console.log(`[Processor:DEFAULT] Received message: "${job.data.message}" at ${new Date(job.data.timestamp).toISOString()}`);

  await new Promise(resolve => setTimeout(resolve, 500));

  if (job.data.message.includes('fail')) {
    throw new Error('Simulated failure for message containing "fail"');
  }

  console.log(`[Processor:DEFAULT] Successfully processed job ${job.id}`);
};

export {
  defaultProcessor,
};
