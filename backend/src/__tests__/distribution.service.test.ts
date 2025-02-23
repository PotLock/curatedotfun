import { describe, expect, it, beforeEach } from "bun:test";
import { DistributionService } from "../services/distribution/distribution.service";
import { DistributorConfig } from "../types/config";
import { PluginError, PluginExecutionError } from "../types/errors";
import { TwitterSubmission } from "../types/twitter";

interface DistributeArgs<T> {
  input: T;
  config: Record<string, unknown>;
}

class MockPluginService {
  private mockPlugins: Record<string, any> = {};
  public cleanupCalled = false;

  setMockPlugin(name: string, plugin: any) {
    this.mockPlugins[name] = plugin;
  }

  async getPlugin(name: string, _config: any) {
    return this.mockPlugins[name] || null;
  }

  async cleanup() {
    this.cleanupCalled = true;
  }
}

describe("DistributionService", () => {
  let distributionService: DistributionService;
  let mockPluginService: MockPluginService;

  beforeEach(() => {
    mockPluginService = new MockPluginService();
    distributionService = new DistributionService(mockPluginService as any);
  });

  describe("distributeContent", () => {
    const mockSubmission: TwitterSubmission = {
      tweetId: "123",
      userId: "user1",
      username: "testuser",
      content: "Test content",
      curatorId: "curator1",
      curatorUsername: "curator",
      curatorNotes: null,
      curatorTweetId: "456",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      moderationHistory: [],
      status: "approved",
    };

    it("should distribute content through plugin", async () => {
      const distributor: DistributorConfig = {
        plugin: "test",
        config: { channel: "test-channel" },
      };

      let distributedContent: any;
      mockPluginService.setMockPlugin("test", {
        distribute: async ({
          input,
          config,
        }: DistributeArgs<TwitterSubmission>) => {
          distributedContent = { input, config };
        },
      });

      await distributionService.distributeContent(distributor, mockSubmission);

      expect(distributedContent).toEqual({
        input: mockSubmission,
        config: distributor.config,
      });
    });

    it("should handle plugin execution errors", async () => {
      const distributor: DistributorConfig = {
        plugin: "error",
        config: {},
      };

      mockPluginService.setMockPlugin("error", {
        distribute: async () => {
          throw new Error("Distribution failed");
        },
      });

      // Should complete without throwing
      await distributionService.distributeContent(distributor, mockSubmission);
      // Test passes if we reach here
    });

    it("should throw system errors", async () => {
      const distributor: DistributorConfig = {
        plugin: "system-error",
        config: {},
      };

      // Mock getPlugin to throw a system error directly
      mockPluginService.getPlugin = async () => {
        throw new TypeError("System error");
      };

      // Should throw system errors directly
      await expect(
        distributionService.distributeContent(distributor, mockSubmission),
      ).rejects.toBeInstanceOf(TypeError);
    });

    it("should handle missing plugin gracefully", async () => {
      const distributor: DistributorConfig = {
        plugin: "nonexistent",
        config: {},
      };

      // Mock getPlugin to throw plugin error
      mockPluginService.getPlugin = async () => {
        throw new PluginError("Plugin not found");
      };

      // Should complete without throwing
      await distributionService.distributeContent(distributor, mockSubmission);
      // Test passes if we reach here
    });

    it("should handle plugin initialization errors", async () => {
      const distributor: DistributorConfig = {
        plugin: "init-error",
        config: {},
      };

      // Mock getPlugin to throw plugin init error
      mockPluginService.getPlugin = async () => {
        throw new PluginError("Plugin initialization failed");
      };

      // Should complete without throwing
      await distributionService.distributeContent(distributor, mockSubmission);
      // Test passes if we reach here
    });

    it("should pass plugin config correctly", async () => {
      const distributor: DistributorConfig = {
        plugin: "config-test",
        config: {
          channel: "test-channel",
          format: "markdown",
        },
      };

      let capturedConfig: any;
      mockPluginService.setMockPlugin("config-test", {
        distribute: async ({ config }: DistributeArgs<TwitterSubmission>) => {
          capturedConfig = config;
        },
      });

      await distributionService.distributeContent(distributor, mockSubmission);

      expect(capturedConfig).toEqual(distributor.config);
    });

    it("should handle empty plugin config", async () => {
      const distributor: DistributorConfig = {
        plugin: "no-config",
        config: {},
      };

      let capturedConfig: any;
      mockPluginService.setMockPlugin("no-config", {
        distribute: async ({ config }: DistributeArgs<TwitterSubmission>) => {
          capturedConfig = config;
        },
      });

      await distributionService.distributeContent(distributor, mockSubmission);

      expect(capturedConfig).toEqual({});
    });
  });

  describe("shutdown", () => {
    it("should cleanup plugins on shutdown", async () => {
      await distributionService.shutdown();
      expect(mockPluginService.cleanupCalled).toBe(true);
    });
  });
});
