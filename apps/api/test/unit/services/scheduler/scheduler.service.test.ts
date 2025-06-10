import { JobType, ScheduleType } from "@crosspost/scheduler-sdk";
import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { SchedulerService } from "../../../../src/services/scheduler/scheduler.service";
import { FeedConfig } from "../../../../src/types/config";
import { RecapState } from "../../../../src/types/recap";

// Test fixtures
const createSampleFeedConfig = (overrides = {}): FeedConfig => ({
  id: "test-feed",
  name: "Test Feed",
  description: "Test feed for unit tests",
  moderation: {
    approvers: {
      twitter: ["test_approver"],
    },
  },
  outputs: {
    stream: {
      enabled: true,
      transform: [],
      distribute: [],
    },
    recap: [
      {
        id: "daily-recap-1",
        name: "Daily Recap",
        enabled: true,
        schedule: "0 0 * * *", // Daily at midnight
        timezone: "UTC",
        transform: [],
        distribute: [],
      },
    ],
  },
  ...overrides,
});

const createRecapState = (overrides = {}): RecapState => ({
  id: 1,
  feedId: "test-feed",
  recapId: "daily-recap-1",
  recapConfigIndex: 0,
  externalJobId: "existing-job-123",
  lastSuccessfulCompletion: null,
  lastRunError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test factory for creating a test context with fresh mocks for each test
const createTestContext = () => {
  // Mock the FeedRepository
  const mockFeedRepository = {
    getFeedConfig: mock(async (feedId: string) => null),
    getAllFeedConfigs: mock(async () => []),
    updateFeedConfig: mock(async (feedId: string, config: FeedConfig) => {}),
    getRecapState: mock(async (feedId: string, recapId: string) => null),
    upsertRecapState: mock(async (stateData: any) => stateData),
    deleteRecapState: mock(async (feedId: string, recapId: string) => {}),
    deleteRecapStatesForFeed: mock(async (feedId: string) => {}),
    getAllRecapStatesForFeed: mock(async (feedId: string) => []),
    getApprovedSubmissionsSince: mock(
      async (feedId: string, since: Date | null, limit?: number) => [],
    ),
    updateRecapCompletion: mock(
      async (feedId: string, recapId: string, timestamp: Date) => {},
    ),
    updateRecapError: mock(
      async (feedId: string, recapId: string, errorMsg: string) => {},
    ),
  };

  // Mock the ProcessorService
  const mockProcessorService = {
    process: mock(async (content: any, config: any) => {}),
    processBatch: mock(async (items: any[], config: any) => {}),
  };

  // Mock the SchedulerClient
  const mockCreateJob = mock(async (job: any) => ({ id: "job-123", ...job }));
  const mockUpdateJob = mock(async (id: string, job: any) => ({ id, ...job }));
  const mockDeleteJob = mock(async (id: string) => id);
  const mockCreateJobIfNotExists = mock(async (job: any) => ({
    id: "job-123",
    ...job,
  }));

  const mockSchedulerClient = {
    createJob: mockCreateJob,
    updateJob: mockUpdateJob,
    deleteJob: mockDeleteJob,
    createJobIfNotExists: mockCreateJobIfNotExists,
  };

  // Create a new instance of the service
  const schedulerService = new SchedulerService(
    mockFeedRepository as any,
    mockProcessorService as any,
    mockSchedulerClient as any,
    "http://localhost:3000", // Mock CURATE_BACKEND_URL
  );

  return {
    schedulerService,
    mockFeedRepository,
    mockProcessorService,
    mockSchedulerClient,
    mockCreateJob,
    mockUpdateJob,
    mockDeleteJob,
    mockCreateJobIfNotExists,
  };
};

describe("SchedulerService", () => {
  describe("initialize", () => {
    test("should sync schedules for all feeds", async () => {
      // Arrange
      const { schedulerService, mockFeedRepository } = createTestContext();

      const feeds = [
        createSampleFeedConfig(),
        createSampleFeedConfig({ id: "another-feed", name: "Another Feed" }),
      ];

      mockFeedRepository.getAllFeedConfigs.mockImplementation(
        async () => feeds,
      );
      const syncSpy = spyOn(
        schedulerService,
        "syncFeedSchedules",
      ).mockImplementation(async () => {});

      // Act
      await schedulerService.initialize();

      // Assert
      expect(syncSpy).toHaveBeenCalledTimes(2);
      expect(syncSpy).toHaveBeenCalledWith("test-feed");
      expect(syncSpy).toHaveBeenCalledWith("another-feed");
    });
  });

  describe("syncFeedSchedules", () => {
    describe("when creating new jobs", () => {
      test("should create a new job when recap is enabled and no existing state", async () => {
        // Arrange
        const {
          schedulerService,
          mockFeedRepository,
          mockCreateJobIfNotExists,
        } = createTestContext();

        const feedConfig = createSampleFeedConfig();
        mockFeedRepository.getFeedConfig.mockImplementation(
          async () => feedConfig,
        );
        mockFeedRepository.getRecapState.mockImplementation(async () => null);
        mockFeedRepository.getAllRecapStatesForFeed.mockImplementation(
          async () => [],
        );

        // Act
        await schedulerService.syncFeedSchedules("test-feed");

        // Assert
        expect(mockCreateJobIfNotExists).toHaveBeenCalledTimes(1);
        expect(mockCreateJobIfNotExists).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "curate-recap-test-feed-daily-recap-1",
            type: JobType.HTTP,
            target: "http://localhost:3000/api/internal/run-recap",
            payload: { feedId: "test-feed", recapId: "daily-recap-1" },
            schedule_type: ScheduleType.CRON,
            cron_expression: "0 0 * * *",
          }),
        );
        expect(mockFeedRepository.upsertRecapState).toHaveBeenCalledTimes(1);
        expect(mockFeedRepository.upsertRecapState).toHaveBeenCalledWith(
          expect.objectContaining({
            feedId: "test-feed",
            recapId: "daily-recap-1",
            externalJobId: "job-123",
          }),
        );
      });
    });

    describe("when updating existing jobs", () => {
      test("should update an existing job when recap is enabled and state exists", async () => {
        // Arrange
        const { schedulerService, mockFeedRepository, mockUpdateJob } =
          createTestContext();

        const feedConfig = createSampleFeedConfig();
        const existingState = createRecapState();

        mockFeedRepository.getFeedConfig.mockImplementation(
          async () => feedConfig,
        );
        mockFeedRepository.getRecapState.mockImplementation(
          async () => existingState,
        );
        mockFeedRepository.getAllRecapStatesForFeed.mockImplementation(
          async () => [existingState],
        );

        // Act
        await schedulerService.syncFeedSchedules("test-feed");

        // Assert
        expect(mockUpdateJob).toHaveBeenCalledTimes(1);
        expect(mockUpdateJob).toHaveBeenCalledWith(
          "existing-job-123",
          expect.objectContaining({
            schedule_type: ScheduleType.CRON,
            cron_expression: "0 0 * * *",
            payload: { feedId: "test-feed", recapId: "daily-recap-1" },
          }),
        );
        expect(mockFeedRepository.upsertRecapState).toHaveBeenCalledTimes(1);
      });
    });

    describe("when deleting jobs", () => {
      test("should delete a job when recap is disabled but state exists", async () => {
        // Arrange
        const { schedulerService, mockFeedRepository, mockDeleteJob } =
          createTestContext();

        // Create a feed config with disabled recap
        const disabledRecapConfig = createSampleFeedConfig();
        if (disabledRecapConfig.outputs.recap) {
          disabledRecapConfig.outputs.recap[0].enabled = false;
        }

        const existingState = createRecapState();

        mockFeedRepository.getFeedConfig.mockImplementation(
          async () => disabledRecapConfig,
        );
        mockFeedRepository.getAllRecapStatesForFeed.mockImplementation(
          async () => [existingState],
        );

        // Act
        await schedulerService.syncFeedSchedules("test-feed");

        // Assert
        expect(mockDeleteJob).toHaveBeenCalledTimes(1);
        expect(mockDeleteJob).toHaveBeenCalledWith("existing-job-123");
        expect(mockFeedRepository.deleteRecapState).toHaveBeenCalledTimes(1);
        expect(mockFeedRepository.deleteRecapState).toHaveBeenCalledWith(
          "test-feed",
          "daily-recap-1",
        );
      });
    });

    describe("when handling multiple recaps", () => {
      test("should handle multiple recaps in a feed correctly", async () => {
        // Arrange
        const {
          schedulerService,
          mockFeedRepository,
          mockUpdateJob,
          mockCreateJobIfNotExists,
          mockDeleteJob,
        } = createTestContext();

        // Create a feed config with multiple recaps
        const multiRecapConfig = createSampleFeedConfig();
        if (multiRecapConfig.outputs.recap) {
          multiRecapConfig.outputs.recap.push({
            id: "weekly-recap-1",
            name: "Weekly Recap",
            enabled: true,
            schedule: "0 0 * * 0", // Weekly on Sunday
            timezone: "UTC",
            transform: [],
            distribute: [],
          });
        }

        const existingState = createRecapState();

        mockFeedRepository.getFeedConfig.mockImplementation(
          async () => multiRecapConfig,
        );
        mockFeedRepository.getRecapState.mockImplementation(
          async (feedId, recapId) => {
            if (recapId === "daily-recap-1") {
              return existingState;
            }
            return null; // No existing state for the second recap
          },
        );
        mockFeedRepository.getAllRecapStatesForFeed.mockImplementation(
          async () => [existingState],
        );

        // Act
        await schedulerService.syncFeedSchedules("test-feed");

        // Assert
        expect(mockUpdateJob).toHaveBeenCalledTimes(1);
        expect(mockUpdateJob).toHaveBeenCalledWith(
          "existing-job-123",
          expect.objectContaining({
            payload: { feedId: "test-feed", recapId: "daily-recap-1" },
          }),
        );

        expect(mockCreateJobIfNotExists).toHaveBeenCalledTimes(1);
        expect(mockCreateJobIfNotExists).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "curate-recap-test-feed-weekly-recap-1",
            payload: { feedId: "test-feed", recapId: "weekly-recap-1" },
          }),
        );

        expect(mockDeleteJob).not.toHaveBeenCalled();
        expect(mockFeedRepository.upsertRecapState).toHaveBeenCalledTimes(2);
      });
    });

    describe("when cleaning up removed recaps", () => {
      test("should clean up state records for removed recaps", async () => {
        // Arrange
        const {
          schedulerService,
          mockFeedRepository,
          mockUpdateJob,
          mockDeleteJob,
        } = createTestContext();

        const feedConfig = createSampleFeedConfig();
        const existingState = createRecapState();
        const removedState = createRecapState({
          id: 2,
          recapId: "removed-recap",
          recapConfigIndex: 1,
          externalJobId: "old-job-456",
        });

        mockFeedRepository.getFeedConfig.mockImplementation(
          async () => feedConfig,
        );
        mockFeedRepository.getRecapState.mockImplementation(
          async (feedId, recapId) => {
            if (recapId === "daily-recap-1") {
              return existingState;
            }
            return null;
          },
        );

        // Return both existing and removed states
        mockFeedRepository.getAllRecapStatesForFeed.mockImplementation(
          async () => [existingState, removedState],
        );

        // Act
        await schedulerService.syncFeedSchedules("test-feed");

        // Assert
        expect(mockUpdateJob).toHaveBeenCalledTimes(1);
        expect(mockUpdateJob).toHaveBeenCalledWith(
          "existing-job-123",
          expect.anything(),
        );

        expect(mockDeleteJob).toHaveBeenCalledTimes(1);
        expect(mockDeleteJob).toHaveBeenCalledWith("old-job-456");

        expect(mockFeedRepository.deleteRecapState).toHaveBeenCalledTimes(1);
        expect(mockFeedRepository.deleteRecapState).toHaveBeenCalledWith(
          "test-feed",
          "removed-recap",
        );
      });
    });
  });

  describe("runRecapJob", () => {
    test("should process submissions and update completion timestamp on success", async () => {
      // Arrange
      const { schedulerService, mockFeedRepository, mockProcessorService } =
        createTestContext();

      const feedConfig = createSampleFeedConfig();
      const submissions = [{ id: "submission-1" }, { id: "submission-2" }];

      mockFeedRepository.getFeedConfig.mockImplementation(
        async () => feedConfig,
      );
      mockFeedRepository.getApprovedSubmissionsSince.mockImplementation(
        async () => submissions,
      );

      // Act
      await schedulerService.runRecapJob("test-feed", "daily-recap-1");

      // Assert
      expect(mockProcessorService.processBatch).toHaveBeenCalledTimes(1);
      expect(mockProcessorService.processBatch).toHaveBeenCalledWith(
        submissions,
        expect.objectContaining({
          transform: [],
          distribute: [],
        }),
      );
      expect(mockFeedRepository.updateRecapCompletion).toHaveBeenCalledTimes(1);
      expect(mockFeedRepository.updateRecapError).not.toHaveBeenCalled();
    });

    test("should update error message on failure", async () => {
      // Arrange
      const { schedulerService, mockFeedRepository, mockProcessorService } =
        createTestContext();

      const feedConfig = createSampleFeedConfig();
      const submissions = [{ id: "submission-1" }, { id: "submission-2" }];

      mockFeedRepository.getFeedConfig.mockImplementation(
        async () => feedConfig,
      );
      mockFeedRepository.getApprovedSubmissionsSince.mockImplementation(
        async () => submissions,
      );

      mockProcessorService.processBatch.mockImplementation(async () => {
        throw new Error("Processing failed");
      });

      // Act
      try {
        await schedulerService.runRecapJob("test-feed", "daily-recap-1");
      } catch (error) {
        // Ignore the error - we expect it to be caught by the service
      }

      // Assert
      expect(mockProcessorService.processBatch).toHaveBeenCalledTimes(1);
      expect(mockFeedRepository.updateRecapCompletion).not.toHaveBeenCalled();
      expect(mockFeedRepository.updateRecapError).toHaveBeenCalledTimes(1);
      expect(mockFeedRepository.updateRecapError).toHaveBeenCalledWith(
        "test-feed",
        "daily-recap-1",
        "Processing failed",
      );
    });
  });
});
