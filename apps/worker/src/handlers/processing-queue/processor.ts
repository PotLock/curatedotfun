import {
  FeedService,
  ProcessorService,
  ServiceProvider,
  SubmissionService,
} from "@curatedotfun/core-services";
import { JobData, QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { logger, NotFoundError } from "@curatedotfun/utils";
import { Job } from "bullmq";

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
    const feedService: FeedService = sp.getFeedService();
    const submissionService: SubmissionService = sp.getSubmissionService();
    const processorService: ProcessorService = sp.getProcessorService();

    const submission = await submissionService.getSubmission(submissionId);
    if (!submission) {
      throw new NotFoundError("Submission", submissionId);
    }

    const feed = await feedService.getFeedById(feedId);
    if (!feed || !feed.config) {
      throw new NotFoundError("Feed or FeedConfig", feedId);
    }

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
