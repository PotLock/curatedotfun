import {
  FeedService,
  ProcessingService,
  ServiceProvider,
  SubmissionService,
} from "@curatedotfun/core-services";
import { JobData, QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { NotFoundError } from "@curatedotfun/utils";
import { Job } from "bullmq";

export const processingProcessor = async (
  job: Job<JobData<typeof QUEUE_NAMES.SUBMISSION_PROCESSING>, any, string>,
  sp: ServiceProvider,
): Promise<void> => {
  const logger = sp.getLogger().child({ component: "ProcessingProcessor" });
  const { submissionId, feedId } = job.data;
  logger.info(
    { jobData: job.data },
    `Received job ${job.id} to process submission ${submissionId} for feed ${feedId}.`,
  );

  try {
    const feedService: FeedService = sp.getFeedService();
    const submissionService: SubmissionService = sp.getSubmissionService();
    const processingService: ProcessingService = sp.getProcessingService();

    const submission = await submissionService.getSubmission(submissionId);
    if (!submission) {
      throw new NotFoundError("Submission", submissionId);
    }

    const feed = await feedService.getFeedById(feedId);
    if (!feed || !feed.config) {
      throw new NotFoundError("Feed or FeedConfig", feedId);
    }

    if (feed.config.outputs?.stream?.enabled) {
      await processingService.process(submission, feed.config.outputs.stream, {
        submissionId,
        feedId,
        idempotencyKey: job.id,
        retryOfJobId: job.data.retryOfJobId,
      });
      logger.info(`Successfully processed job ${job.id}.`);
    } else {
      logger.info(
        `Stream processing not enabled for feed ${feedId}. Job ${job.id} considered complete.`,
      );
    }
  } catch (error) {
    logger.error(
      { err: error, jobId: job.id, jobData: job.data },
      `Failed to process job ${job.id}.`,
    );
    throw error; // Re-throw to let BullMQ handle retry/failure logic
  }
};
