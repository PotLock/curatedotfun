import { Job } from "bullmq";
import { QUEUE_NAMES, JobData } from "@curatedotfun/shared-queue";
import { ServiceProvider } from "@curatedotfun/core-services";
import { logger } from "@curatedotfun/utils";
import { NotFoundError } from "@curatedotfun/utils"; // Assuming error types are in utils

export const processingProcessor = async (
  job: Job<JobData<typeof QUEUE_NAMES.SUBMISSION_PROCESSING>, any, string>,
  sp: ServiceProvider,
): Promise<void> => {
  const { submissionId, feedId } = job.data;
  logger.info(
    { jobData: job.data },
    `[Processor:${QUEUE_NAMES.SUBMISSION_PROCESSING}] Received job ${job.id} to process submission ${submissionId} for feed ${feedId}.`,
  );

  try {
    const submissionRepository = sp.getService<any>("submissionRepository"); // TODO: Get actual repository type if available
    const feedRepository = sp.getService<any>("feedRepository"); // TODO: Get actual repository type if available
    const processorService = sp.getProcessorService();

    const submission = await submissionRepository.getSubmission(submissionId);
    if (!submission) {
      throw new NotFoundError("Submission", submissionId);
    }

    const feed = await feedRepository.getFeedById(feedId); // Or getFeedWithConfig
    if (!feed || !feed.config) {
      throw new NotFoundError("Feed or FeedConfig", feedId);
    }

    // Assuming feed.config.outputs.stream is the correct config path
    if (feed.config.outputs?.stream?.enabled) {
      await processorService.process(submission, feed.config.outputs.stream);
      logger.info(
        `[Processor:${QUEUE_NAMES.SUBMISSION_PROCESSING}] Successfully processed job ${job.id}.`,
      );
    } else {
      logger.info(
        `[Processor:${QUEUE_NAMES.SUBMISSION_PROCESSING}] Stream processing not enabled for feed ${feedId}. Job ${job.id} considered complete.`,
      );
    }
  } catch (error) {
    logger.error(
      { err: error, jobId: job.id, jobData: job.data },
      `[Processor:${QUEUE_NAMES.SUBMISSION_PROCESSING}] Failed to process job ${job.id}.`,
    );
    throw error; // Re-throw to let BullMQ handle retry/failure logic
  }
};
