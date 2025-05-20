import {
  SchedulerClient,
  JobType,
  ScheduleType,
  IntervalType,
  JobNotFoundError,
  JobStatus,
} from "@crosspost/scheduler-sdk";
import { FeedRepository } from "./db/repositories/feed.repository";
import { ProcessorService } from "./processor.service";
import { logger } from "../utils/logger";
import { RecapConfig, RecapState } from "../types/recap";

/**
 * Configuration for a scheduled job
 */
interface ScheduleConfig {
  schedule_type: ScheduleType;
  cron_expression?: string;
  interval?: IntervalType;
  interval_value?: number;
}

/**
 * Service for managing scheduled recap jobs
 */
export class SchedulerService {
  constructor(
    private feedRepository: FeedRepository,
    private processorService: ProcessorService,
    private schedulerClient: SchedulerClient,
    private backendUrl: string,
  ) {}

  /**
   * Initialize the scheduler service
   * Syncs all feed schedules on startup
   */
  async initialize(): Promise<void> {
    logger.info("Initializing scheduler service");

    try {
      // Get all feed configs
      const feedConfigs = await this.feedRepository.getAllFeedConfigs();

      // Sync schedules for each feed
      for (const feedConfig of feedConfigs) {
        await this.syncFeedSchedules(feedConfig.id);
      }

      logger.info("Scheduler service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize scheduler service:", error);
      throw error;
    }
  }

  /**
   * Synchronize recap schedules for a feed
   * Creates, updates, or deletes jobs based on the feed configuration
   */
  async syncFeedSchedules(feedId: string): Promise<void> {
    logger.info(`Syncing schedules for feed: ${feedId}`);

    try {
      // Get feed config
      const feedConfig = await this.feedRepository.getFeedConfig(feedId);
      if (!feedConfig) {
        logger.warn(`Feed not found: ${feedId}`);
        return;
      }

      // Get all existing recap states for this feed
      const existingStates =
        await this.feedRepository.getAllRecapStatesForFeed(feedId);

      // Process each recap config
      const recaps = feedConfig.outputs.recap || [];
      for (const recapConfig of recaps) {
        await this.syncRecapJob(feedId, recapConfig, existingStates);
      }

      // Clean up any state records for recaps that no longer exist
      for (const state of existingStates) {
        // Check if this state record corresponds to a recap that still exists
        const recapStillExists = recaps.some(
          (recap) => recap.id === state.recapId,
        );

        // If the recap no longer exists, clean it up
        if (!recapStillExists) {
          logger.info(
            `Cleaning up state for removed recap: ${feedId}/${state.recapId}`,
          );

          // Delete the external job if it exists
          if (state.externalJobId) {
            try {
              await this.schedulerClient.deleteJob(state.externalJobId);
              logger.info(`Deleted external job: ${state.externalJobId}`);
            } catch (error) {
              if (error instanceof JobNotFoundError) {
                logger.warn(
                  `Job not found, already deleted: ${state.externalJobId}`,
                );
              } else {
                logger.error(
                  `Failed to delete job: ${state.externalJobId}`,
                  error,
                );
              }
            }
          }

          // Delete the state record
          await this.feedRepository.deleteRecapState(feedId, state.recapId);
        }
      }

      logger.info(`Successfully synced schedules for feed: ${feedId}`);
    } catch (error) {
      logger.error(`Failed to sync schedules for feed: ${feedId}`, error);
      throw error;
    }
  }

  /**
   * Synchronize a single recap job
   */
  private async syncRecapJob(
    feedId: string,
    recapConfig: RecapConfig,
    existingStates: RecapState[],
  ): Promise<void> {
    // Find existing state for this recap by ID
    const existingState = existingStates.find(
      (state) => state.recapId === recapConfig.id,
    );

    // Job name must be unique and consistent
    const jobName = `curate-recap-${feedId}-${recapConfig.id}`;

    // Payload for the job
    const payload = { feedId, recapId: recapConfig.id };

    // Target URL for the job
    const target = `${this.backendUrl}/api/trigger/recap`;

    // Parse schedule
    const scheduleConfig = this.parseSchedule(recapConfig.schedule);

    if (recapConfig.enabled) {
      // Recap is enabled, create or update job
      if (existingState?.externalJobId) {
        // Update existing job
        try {
          logger.info(`Updating job for recap: ${feedId}/${recapConfig.id}`);

          const updatedJob = await this.schedulerClient.updateJob(
            existingState.externalJobId,
            {
              ...scheduleConfig,
              payload,
              target,
            },
          );

          if (!updatedJob || !updatedJob.id) {
            throw new Error(
              `Failed to update job: ${existingState.externalJobId} - No job ID returned`,
            );
          }

          // Update state record
          await this.feedRepository.upsertRecapState({
            feedId,
            recapId: recapConfig.id,
            externalJobId: updatedJob.id,
            lastSuccessfulCompletion: existingState.lastSuccessfulCompletion,
            lastRunError: existingState.lastRunError,
          });

          logger.info(`Successfully updated job: ${updatedJob.id}`);
        } catch (error) {
          if (error instanceof JobNotFoundError) {
            logger.warn(
              `Job not found, creating new one: ${existingState.externalJobId}`,
            );
            await this.createNewJob(
              feedId,
              recapConfig,
              jobName,
              target,
              payload,
              scheduleConfig,
              existingState || null,
            );
          } else {
            logger.error(
              `Failed to update job: ${existingState.externalJobId}`,
              error,
            );
            throw error;
          }
        }
      } else {
        // Create new job
        await this.createNewJob(
          feedId,
          recapConfig,
          jobName,
          target,
          payload,
          scheduleConfig,
          existingState || null,
        );
      }
    } else if (existingState?.externalJobId) {
      // Recap is disabled but job exists, delete it
      try {
        logger.info(
          `Deleting job for disabled recap: ${feedId}/${recapConfig.id}`,
        );

        await this.schedulerClient.deleteJob(existingState.externalJobId);
        await this.feedRepository.deleteRecapState(feedId, recapConfig.id);

        logger.info(`Successfully deleted job: ${existingState.externalJobId}`);
      } catch (error) {
        if (error instanceof JobNotFoundError) {
          logger.warn(
            `Job not found, already deleted: ${existingState.externalJobId}`,
          );
          await this.feedRepository.deleteRecapState(feedId, recapConfig.id);
        } else {
          logger.error(
            `Failed to delete job: ${existingState.externalJobId}`,
            error,
          );
          throw error;
        }
      }
    }
  }

  /**
   * Create a new job for a recap
   */
  private async createNewJob(
    feedId: string,
    recapConfig: RecapConfig,
    jobName: string,
    target: string,
    payload: { feedId: string; recapId: string },
    scheduleConfig: ScheduleConfig,
    existingState: RecapState | null,
  ): Promise<void> {
    try {
      logger.info(`Creating new job for recap: ${feedId}/${recapConfig.id}`);

      const newJob = await this.schedulerClient.createJob({
        name: jobName,
        type: JobType.HTTP,
        status: JobStatus.ACTIVE,
        target,
        payload,
        ...scheduleConfig,
      });

      if (!newJob || !newJob.id) {
        throw new Error(
          `Failed to create job for recap: ${feedId}/${recapConfig.id} - No job ID returned`,
        );
      }

      // Update state record
      await this.feedRepository.upsertRecapState({
        feedId,
        recapId: recapConfig.id,
        externalJobId: newJob.id,
        lastSuccessfulCompletion:
          existingState?.lastSuccessfulCompletion ?? null,
        lastRunError: existingState?.lastRunError ?? null,
      });

      logger.info(`Successfully created job: ${newJob.id}`);
    } catch (error) {
      logger.error(
        `Failed to create job for recap: ${feedId}/${recapConfig.id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Parse a schedule string into scheduler SDK config
   * Supports cron expressions and interval specifications
   */
  private parseSchedule(schedule: string): ScheduleConfig {
    // Check if it's a cron expression
    if (schedule.includes(" ") && schedule.split(" ").length >= 5) {
      return {
        schedule_type: ScheduleType.CRON,
        cron_expression: schedule,
      };
    }

    // Check if it's an interval specification (e.g., "day:1")
    const intervalMatch = schedule.match(/^([a-z]+):(\d+)$/i);
    if (intervalMatch) {
      const [, intervalType, intervalValue] = intervalMatch;

      // Map interval type to SDK enum
      let mappedIntervalType: IntervalType;
      switch (intervalType.toLowerCase()) {
        case "minute":
          mappedIntervalType = IntervalType.MINUTE;
          break;
        case "hour":
          mappedIntervalType = IntervalType.HOUR;
          break;
        case "day":
          mappedIntervalType = IntervalType.DAY;
          break;
        case "week":
          mappedIntervalType = IntervalType.WEEK;
          break;
        case "month":
          mappedIntervalType = IntervalType.MONTH;
          break;
        case "year":
          mappedIntervalType = IntervalType.YEAR;
          break;
        default:
          throw new Error(`Unsupported interval type: ${intervalType}`);
      }

      return {
        schedule_type: ScheduleType.RECURRING,
        interval: mappedIntervalType,
        interval_value: parseInt(intervalValue, 10),
      };
    }

    // Default to treating it as a cron expression
    return {
      schedule_type: ScheduleType.CRON,
      cron_expression: schedule,
    };
  }

  /**
   * Run a recap job
   * This is called by the internal API endpoint when a job is triggered
   */
  async runRecapJob(feedId: string, recapId: string): Promise<void> {
    logger.info(`Running recap job: ${feedId}/${recapId}`);

    try {
      // Get feed config
      const feedConfig = await this.feedRepository.getFeedConfig(feedId);
      if (!feedConfig) {
        throw new Error(`Feed not found: ${feedId}`);
      }

      // Get recap config
      const recaps = feedConfig.outputs.recap || [];
      const recapConfig = recaps.find((recap) => recap.id === recapId);

      if (!recapConfig) {
        throw new Error(`Recap config not found: ${feedId}/${recapId}`);
      }

      // Get recap state
      const recapState = await this.feedRepository.getRecapState(
        feedId,
        recapId,
      );

      // Get approved submissions since last successful completion
      const submissions = await this.feedRepository.getApprovedSubmissionsSince(
        feedId,
        recapState?.lastSuccessfulCompletion || null,
      );

      if (submissions.length === 0) {
        logger.info(`No new submissions for recap: ${feedId}/${recapId}`);
        // Still update the completion timestamp to avoid processing the same time period again
        await this.feedRepository.updateRecapCompletion(
          feedId,
          recapId,
          new Date(),
        );
        return;
      }

      // Process the submissions
      await this.processorService.processBatch(submissions, recapConfig);

      // Update the last successful completion timestamp
      await this.feedRepository.updateRecapCompletion(
        feedId,
        recapId,
        new Date(),
      );

      logger.info(`Successfully ran recap job: ${feedId}/${recapId}`);
    } catch (error) {
      logger.error(`Failed to run recap job: ${feedId}/${recapId}`, error);

      // Update the error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.feedRepository.updateRecapError(feedId, recapId, errorMessage);

      throw error;
    }
  }
}
