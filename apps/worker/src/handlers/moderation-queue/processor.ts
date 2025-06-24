import { Job } from "bullmq";
import { QUEUE_NAMES, JobData } from "@curatedotfun/shared-queue";
import { ServiceProvider } from "@curatedotfun/core-services";
import { logger } from "@curatedotfun/utils";

export const moderationProcessor = async (
  job: Job<JobData<typeof QUEUE_NAMES.MODERATION>, any, string>,
  sp: ServiceProvider,
): Promise<void> => {
  const { submissionId, feedId, action, moderatorAccountId, moderatorAccountIdType, source, note } = job.data;
  logger.info(
    { jobData: job.data },
    `[Processor:${QUEUE_NAMES.MODERATION}] Received job ${job.id} to ${action} submission ${submissionId} for feed ${feedId}.`,
  );

  try {
    const moderationService = sp.getModerationService();
    await moderationService.createModerationAction({
      submissionId,
      feedId,
      action,
      moderatorAccountId,
      moderatorAccountIdType,
      source,
      note,
    });

    logger.info(
      `[Processor:${QUEUE_NAMES.MODERATION}] Successfully processed job ${job.id}.`,
    );
  } catch (error) {
    logger.error(
      { err: error, jobId: job.id, jobData: job.data },
      `[Processor:${QUEUE_NAMES.MODERATION}] Failed to process job ${job.id}.`,
    );
    throw error; // Re-throw to let BullMQ handle retry/failure logic
  }
};
