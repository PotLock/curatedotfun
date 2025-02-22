import { describe, expect, it, beforeEach } from "bun:test";
import { TransformationService } from "../services/transformation/transformation.service";
import { TransformError } from "../types/errors";
import { TransformConfig } from "../types/config";

interface TransformArgs {
  input: unknown;
  config: Record<string, unknown>;
}

class MockPluginService {
  private mockPlugins: Record<string, any> = {};

  setMockPlugin(name: string, plugin: any) {
    this.mockPlugins[name] = plugin;
  }

  async getPlugin(name: string, _config: any) {
    return this.mockPlugins[name] || null;
  }
}

describe("TransformationService", () => {
  let transformationService: TransformationService;
  let mockPluginService: MockPluginService;

  beforeEach(() => {
    mockPluginService = new MockPluginService();
    transformationService = new TransformationService(mockPluginService as any);
  });

  describe("applyTransforms", () => {
    it("should apply transforms in sequence", async () => {
      const transforms = [
        { plugin: "transform1", config: {} },
        { plugin: "transform2", config: {} }
      ];

      // Mock transform plugins
      mockPluginService.setMockPlugin("transform1", {
        transform: async ({ input }: TransformArgs) => ({ ...input as object, key1: "value1" })
      });
      mockPluginService.setMockPlugin("transform2", {
        transform: async ({ input }: TransformArgs) => ({ ...input as object, key2: "value2" })
      });

      const result = await transformationService.applyTransforms(
        { initial: "content" },
        transforms,
        "global"
      );

      expect(result).toEqual({
        initial: "content",
        key1: "value1",
        key2: "value2"
      });
    });

    it("should handle empty transform array", async () => {
      const content = { test: "content" };
      const result = await transformationService.applyTransforms(content, [], "global");
      expect(result).toEqual(content);
    });

    it("should throw TransformError for invalid transform output", async () => {
      const transforms = [{ plugin: "invalid", config: {} }];

      mockPluginService.setMockPlugin("invalid", {
        transform: async () => null
      });

      await expect(
        transformationService.applyTransforms({ test: "content" }, transforms, "global")
      ).rejects.toThrow(TransformError);
    });

    it("should handle different transform stages", async () => {
      const globalTransforms = [
        { plugin: "global1", config: {} },
        { plugin: "global2", config: {} }
      ];

      const distributorTransforms = [
        { plugin: "dist1", config: {} },
        { plugin: "dist2", config: {} }
      ];

      // Mock transform plugins
      mockPluginService.setMockPlugin("global1", {
        transform: async ({ input }: TransformArgs) => ({ ...input as object, global1: true })
      });
      mockPluginService.setMockPlugin("global2", {
        transform: async ({ input }: TransformArgs) => ({ ...input as object, global2: true })
      });
      mockPluginService.setMockPlugin("dist1", {
        transform: async ({ input }: TransformArgs) => ({ ...input as object, dist1: true })
      });
      mockPluginService.setMockPlugin("dist2", {
        transform: async ({ input }: TransformArgs) => ({ ...input as object, dist2: true })
      });

      // Apply global transforms
      const globalResult = await transformationService.applyTransforms(
        { initial: "content" },
        globalTransforms,
        "global"
      );

      expect(globalResult).toEqual({
        initial: "content",
        global1: true,
        global2: true
      });

      // Apply distributor transforms
      const distributorResult = await transformationService.applyTransforms(
        globalResult,
        distributorTransforms,
        "distributor"
      );

      expect(distributorResult).toEqual({
        initial: "content",
        global1: true,
        global2: true,
        dist1: true,
        dist2: true
      });
    });

    it("should propagate plugin errors as TransformError", async () => {
      const transforms = [{ plugin: "error", config: {} }];

      mockPluginService.setMockPlugin("error", {
        transform: async () => {
          throw new Error("Plugin error");
        }
      });

      await expect(
        transformationService.applyTransforms({ test: "content" }, transforms, "global")
      ).rejects.toThrow(TransformError);
    });

    it("should merge array results correctly", async () => {
      const transforms = [
        { plugin: "array1", config: {} },
        { plugin: "array2", config: {} }
      ];

      mockPluginService.setMockPlugin("array1", {
        transform: async () => ["item1", "item2"]
      });
      mockPluginService.setMockPlugin("array2", {
        transform: async ({ input }: TransformArgs) => [...input as string[], "item3"]
      });

      const result = await transformationService.applyTransforms(
        [],
        transforms,
        "global"
      );

      expect(result).toEqual(["item1", "item2", "item3"]);
    });

    it("should handle transform config", async () => {
      const transforms = [
        {
          plugin: "configTest",
          config: { key: "value" }
        }
      ];

      let capturedConfig: any;
      mockPluginService.setMockPlugin("configTest", {
        transform: async ({ input, config }: TransformArgs) => {
          capturedConfig = config;
          return input;
        }
      });

      await transformationService.applyTransforms(
        { test: "content" },
        transforms,
        "global"
      );

      expect(capturedConfig).toEqual({ key: "value" });
    });

    it("should preserve non-object transform results", async () => {
      const transforms = [
        { plugin: "string", config: {} },
        { plugin: "number", config: {} }
      ];

      mockPluginService.setMockPlugin("string", {
        transform: async () => "string result"
      });
      mockPluginService.setMockPlugin("number", {
        transform: async () => 42
      });

      const stringResult = await transformationService.applyTransforms(
        "initial",
        [transforms[0]],
        "global"
      );
      expect(stringResult).toBe("string result");

      const numberResult = await transformationService.applyTransforms(
        0,
        [transforms[1]],
        "global"
      );
      expect(numberResult).toBe(42);
    });
  });
});
