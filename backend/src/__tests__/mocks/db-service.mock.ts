import { DatabaseService } from "../../services/db";
import {
  Moderation,
  SubmissionFeed,
  SubmissionStatus,
  TwitterCookie,
  TwitterSubmission,
  TwitterSubmissionWithFeedData,
} from "../../types/twitter";

// Create a mock function helper since we can't use jest directly
type MockFunction<T> = T & {
  mockReset: () => void;
  mockReturnValue: (value: any) => MockFunction<T>;
  mock: {
    calls: any[][];
  };
};

function createMockFn<T extends (...args: any[]) => any>(
  implementation?: T,
): MockFunction<T> {
  const calls: any[][] = [];
  let returnValue: any = undefined;

  const mockFn = ((...args: any[]) => {
    calls.push(args);
    return returnValue;
  }) as MockFunction<T>;

  mockFn.mockReset = () => {
    calls.length = 0;
    returnValue = undefined;
  };

  mockFn.mockReturnValue = (value: any) => {
    returnValue = value;
    return mockFn;
  };

  mockFn.mock = { calls };

  return mockFn;
}

/**
 * Mock implementation of DatabaseService for testing
 */
export class MockDatabaseService {
  private static instance: MockDatabaseService | null = null;
  private isConnected: boolean = true;

  // Create mock functions for each database operation
  public getSubmissionByCuratorTweetId = createMockFn(() => null);
  public getSubmission = createMockFn(() => null);
  public getDailySubmissionCount = createMockFn(() => 0);
  public saveSubmission = createMockFn(() => {});
  public saveSubmissionToFeed = createMockFn(() => {});
  public incrementDailySubmissionCount = createMockFn(() => {});
  public saveModerationAction = createMockFn(() => {});
  public updateSubmissionFeedStatus = createMockFn(() => {});
  public getFeedsBySubmission = createMockFn(() => []);
  public upsertFeeds = createMockFn(() => {});
  public getTwitterCacheValue = createMockFn(() => null);
  public setTwitterCacheValue = createMockFn(() => {});
  public getAllSubmissions = createMockFn(() => []);
  public getSubmissionsByFeed = createMockFn(() => []);
  public getFeedPlugin = createMockFn(() => null);
  public upsertFeedPlugin = createMockFn(() => {});
  public deleteTwitterCacheValue = createMockFn(() => {});
  public clearTwitterCache = createMockFn(() => {});
  public getLeaderboard = createMockFn(() => []);
  public getPostsCount = createMockFn(() => 0);
  public getCuratorsCount = createMockFn(() => 0);
  public getTwitterCookies = createMockFn(() => null);
  public setTwitterCookies = createMockFn(() => {});
  public deleteTwitterCookies = createMockFn(() => {});
  public removeFromSubmissionFeed = createMockFn(() => {});
  public healthCheck = createMockFn(() => ({ status: "ok" }));

  /**
   * Get the singleton instance of MockDatabaseService.
   */
  public static getInstance(): MockDatabaseService {
    if (!MockDatabaseService.instance) {
      MockDatabaseService.instance = new MockDatabaseService();
    }
    return MockDatabaseService.instance;
  }

  /**
   * Mock connect method that does nothing but set isConnected to true
   */
  public async connect(): Promise<void> {
    this.isConnected = true;
  }

  /**
   * Mock disconnect method that does nothing but set isConnected to false
   */
  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  /**
   * Mock transaction method
   */
  public async transaction<T>(
    operations: (client: any) => Promise<T>,
  ): Promise<T> {
    // Just execute the operations without any transaction
    return operations({} as any);
  }

  /**
   * Reset all mock functions
   */
  public resetMocks(): void {
    const mockFunctions = [
      this.getSubmissionByCuratorTweetId,
      this.getSubmission,
      this.getDailySubmissionCount,
      this.saveSubmission,
      this.saveSubmissionToFeed,
      this.incrementDailySubmissionCount,
      this.saveModerationAction,
      this.updateSubmissionFeedStatus,
      this.getFeedsBySubmission,
      this.upsertFeeds,
      this.getTwitterCacheValue,
      this.setTwitterCacheValue,
      this.getAllSubmissions,
      this.getSubmissionsByFeed,
      this.getFeedPlugin,
      this.upsertFeedPlugin,
      this.deleteTwitterCacheValue,
      this.clearTwitterCache,
      this.getLeaderboard,
      this.getPostsCount,
      this.getCuratorsCount,
      this.getTwitterCookies,
      this.setTwitterCookies,
      this.deleteTwitterCookies,
      this.removeFromSubmissionFeed,
      this.healthCheck,
    ];

    mockFunctions.forEach((mockFn) => {
      if (mockFn && typeof mockFn.mockReset === "function") {
        mockFn.mockReset();
      }
    });
  }
}

// Create a singleton instance
export const mockDbService = MockDatabaseService.getInstance();

// Helper to reset all mock functions
export const resetMockDbService = () => {
  mockDbService.resetMocks();
};

// Override the getInstance method of the real DatabaseService for testing
// This is the key part that allows us to inject our mock
const originalGetInstance = DatabaseService.getInstance;

// Create a mock function for getInstance
const mockGetInstance = () => mockDbService as unknown as DatabaseService;
(mockGetInstance as any).mockReset = () => {};

// Replace the original getInstance with our mock
(DatabaseService as any).getInstance = mockGetInstance;

// Export a function to restore the original getInstance method after tests
export const restoreOriginalGetInstance = () => {
  (DatabaseService as any).getInstance = originalGetInstance;
};
