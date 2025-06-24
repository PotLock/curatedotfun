import {
  ModerationService,
  ServiceProvider,
} from "@curatedotfun/core-services";
import { JobData, QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { Job } from "bullmq";

export const moderationProcessor = async (
  job: Job<JobData<typeof QUEUE_NAMES.MODERATION>, any, string>,
  sp: ServiceProvider,
): Promise<void> => {
  const logger = sp.getLogger().child({ component: "ModerationProcessor" });
  const {
    submissionId,
    feedId,
    action,
    moderatorAccountId,
    moderatorAccountIdType,
    source,
    note,
  } = job.data;
  logger.info(
    { jobData: job.data },
    `Received job ${job.id} to ${action} submission ${submissionId} for feed ${feedId}.`,
  );

  try {
    const moderationService: ModerationService = sp.getModerationService();
    await moderationService.createModerationAction({
      submissionId,
      feedId,
      action,
      moderatorAccountId,
      moderatorAccountIdType,
      source,
      note,
    });

    logger.info(`Successfully processed job ${job.id}.`);
  } catch (error) {
    logger.error(
      { err: error, jobId: job.id, jobData: job.data },
      `Failed to process job ${job.id}.`,
    );
    throw error; // Re-throw to let BullMQ handle retry/failure logic
  }
};
