import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { createApp } from "../../app";
import { SubmissionService } from "../../services/submissions/submission.service";
import { DistributionService } from "../../services/distribution/distribution.service";
import { ProcessorService } from "../../services/processor/processor.service";
import { HonoAppType, AppInstance } from "../../types/app";
import { serve } from "@hono/node-server";

// Define types for our test
interface Submission {
  id: string;
  content: string;
  source: string;
  sourceId: string;
  status: string;
  feed: string;
  createdAt: string;
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

// Mock the distribution service
const mockDistributionService = {
  distribute: mock(() => Promise.resolve({ success: true })),
  getDistributors: mock(() => [
    { id: "test-distributor", name: "Test Distributor" },
  ]),
};

// Mock the processor service
const mockProcessorService = {
  process: mock((submission: Submission) =>
    Promise.resolve({
      ...submission,
      processed: true,
      transformedContent: "Transformed content",
    }),
  ),
};

describe("Submission and Distribution Integration", () => {
  let appInstance: AppInstance;
  let server: ReturnType<typeof serve>;

  beforeAll(async () => {
    // Create the app
    appInstance = await createApp();

    // Replace real services with mocks
    // This is a simplified example - in a real test you would use dependency injection
    // or a more sophisticated mocking approach
    (SubmissionService as any).prototype.processSubmission = async (
      submission: Submission,
    ) => {
      return mockProcessorService.process(submission);
    };

    (DistributionService as any).prototype.distribute =
      mockDistributionService.distribute;
    (DistributionService as any).prototype.getDistributors =
      mockDistributionService.getDistributors;

    // Start the server
    const port = 0; // Use port 0 to get a random available port
    server = serve({ fetch: appInstance.app.fetch, port });
  });

  afterAll(() => {
    server.close();
  });

  test("should process a submission and distribute it", async () => {
    // Create a test submission
    const submission = {
      id: "test-submission-id",
      content: "Test submission content",
      source: "twitter",
      sourceId: "12345",
      status: "pending",
      feed: "test-feed",
      createdAt: new Date().toISOString(),
    };

    // Submit the submission
    const response = await fetch(
      `http://localhost:${(server.address() as any).port}/api/submission`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submission),
      },
    );

    // Check the response
    expect(response.status).toBe(200);
    const result = (await response.json()) as ApiResponse;
    expect(result.success).toBe(true);

    // Verify that the processor service was called
    expect(mockProcessorService.process).toHaveBeenCalled();
    expect(mockProcessorService.process.mock.calls[0][0]).toMatchObject({
      content: "Test submission content",
    });

    // Verify that the distribution service was called
    expect(mockDistributionService.distribute).toHaveBeenCalled();
  });

  test("should handle errors during submission processing", async () => {
    // Mock an error in the processor service
    mockProcessorService.process.mockImplementationOnce(() => {
      throw new Error("Processing error");
    });

    // Create a test submission
    const submission = {
      id: "test-error-submission",
      content: "Test error submission",
      source: "twitter",
      sourceId: "67890",
      status: "pending",
      feed: "test-feed",
      createdAt: new Date().toISOString(),
    };

    // Submit the submission
    const response = await fetch(
      `http://localhost:${(server.address() as any).port}/api/submission`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submission),
      },
    );

    // Check the response
    expect(response.status).toBe(500);
    const result = (await response.json()) as ApiResponse;
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
