import { describe, expect, it, beforeEach } from "bun:test";
import { ProcessorService } from "../services/processor/processor.service";
import { TransformationService } from "../services/transformation/transformation.service";
import { DistributionService } from "../services/distribution/distribution.service";
import {
  ProcessorError,
  TransformError,
  TransformStage,
} from "../types/errors";
import { DistributorConfig, TransformConfig } from "../types/config";

class MockTransformationService {
  async applyTransforms(
    content: any,
    transforms: TransformConfig[],
    stage: TransformStage,
  ) {
    // Default implementation returns transformed content
    return { ...content, transformed: true, stage };
  }
}

class MockDistributionService {
  public distributedItems: { distributor: DistributorConfig; content: any }[] =
    [];

  async distributeContent(distributor: DistributorConfig, content: any) {
    this.distributedItems.push({ distributor, content });
  }
}

describe("ProcessorService", () => {
  let processorService: ProcessorService;
  let mockTransformationService: MockTransformationService;
  let mockDistributionService: MockDistributionService;

  beforeEach(() => {
    mockTransformationService = new MockTransformationService();
    mockDistributionService = new MockDistributionService();
    processorService = new ProcessorService(
      mockTransformationService as any,
      mockDistributionService as any,
    );
  });

  describe("process", () => {
    const mockContent = { test: "content" };

    it("should process content through transformation pipeline", async () => {
      const config = {
        transform: [{ plugin: "test", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      await processorService.process(mockContent, config);

      // Content should have been distributed
      expect(mockDistributionService.distributedItems).toHaveLength(1);
      expect(mockDistributionService.distributedItems[0].content).toEqual({
        ...mockContent,
        transformed: true,
        stage: "global",
      });
    });

    it("should handle distributor-specific transforms", async () => {
      const config = {
        transform: [{ plugin: "global", config: {} }],
        distribute: [
          {
            plugin: "dist1",
            config: {},
            transform: [{ plugin: "dist-transform", config: {} }],
          },
        ],
      };

      // Mock transformation service to track transform stages
      let transformCalls: { content: any; stage: TransformStage }[] = [];
      mockTransformationService.applyTransforms = async (
        content: any,
        _transforms: TransformConfig[],
        stage: TransformStage,
      ) => {
        transformCalls.push({ content, stage });
        return { ...content, transformed: stage };
      };

      await processorService.process(mockContent, config);

      // Verify transform order
      expect(transformCalls).toHaveLength(2);
      expect(transformCalls[0].stage).toBe("global");
      expect(transformCalls[1].stage).toBe("distributor");

      // Verify final distributed content
      expect(mockDistributionService.distributedItems[0].content).toEqual({
        ...mockContent,
        transformed: "distributor",
      });
    });

    it("should continue with other distributors if one fails", async () => {
      const config = {
        distribute: [
          { plugin: "fail", config: {} },
          { plugin: "success", config: {} },
        ],
      };

      // Make first distributor fail
      let firstCall = true;
      mockDistributionService.distributeContent = async (
        distributor: DistributorConfig,
        content: any,
      ) => {
        if (firstCall) {
          firstCall = false;
          throw new Error("Distribution failed");
        }
        mockDistributionService.distributedItems.push({ distributor, content });
      };

      await processorService.process(mockContent, config);

      // Second distributor should still have received content
      expect(mockDistributionService.distributedItems).toHaveLength(1);
      expect(
        mockDistributionService.distributedItems[0].distributor.plugin,
      ).toBe("success");
    });

    it("should throw if all distributors fail", async () => {
      const config = {
        distribute: [
          { plugin: "fail1", config: {} },
          { plugin: "fail2", config: {} },
        ],
      };

      mockDistributionService.distributeContent = async () => {
        throw new Error("Distribution failed");
      };

      await expect(
        processorService.process(mockContent, config),
      ).rejects.toThrow(ProcessorError);
    });

    it("should continue with original content on transform error", async () => {
      const config = {
        transform: [{ plugin: "fail", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      mockTransformationService.applyTransforms = async () => {
        throw new TransformError("test", "global", 0, "Transform failed");
      };

      await processorService.process(mockContent, config);

      // Should distribute original content
      expect(mockDistributionService.distributedItems[0].content).toEqual(
        mockContent,
      );
    });

    it("should throw error if no distributors configured", async () => {
      const config = {
        transform: [{ plugin: "test", config: {} }],
      };

      await expect(
        processorService.process(mockContent, config),
      ).rejects.toThrow("No distributors configured");
    });
  });

  describe("processBatch", () => {
    const mockItems = [
      { id: 1, content: "test1" },
      { id: 2, content: "test2" },
    ];

    it("should process batch items independently", async () => {
      const config = {
        transform: [{ plugin: "item", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      let transformCalls = 0;
      mockTransformationService.applyTransforms = async (
        content: any,
        _transforms: TransformConfig[],
        stage: TransformStage,
      ) => {
        transformCalls++;
        return { ...content, transformed: stage };
      };

      await processorService.processBatch(mockItems, config);

      // Each item should be transformed
      expect(transformCalls).toBe(mockItems.length);
      expect(mockDistributionService.distributedItems).toHaveLength(1);
    });

    it("should apply batch transforms to collected results", async () => {
      const config = {
        transform: [{ plugin: "item", config: {} }],
        batchTransform: [{ plugin: "batch", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      let stages: TransformStage[] = [];
      mockTransformationService.applyTransforms = async (
        content: any,
        _transforms: TransformConfig[],
        stage: TransformStage,
      ) => {
        stages.push(stage);
        return { ...content, stage };
      };

      await processorService.processBatch(mockItems, config);

      // Verify transform stages
      expect(stages).toEqual(["global", "global", "batch"]);
    });

    it("should continue with untransformed batch on batch transform error", async () => {
      const config = {
        batchTransform: [{ plugin: "fail", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      mockTransformationService.applyTransforms = async (
        _content: any,
        _transforms: TransformConfig[],
        stage: TransformStage,
      ) => {
        if (stage === "batch") {
          throw new TransformError("test", stage, 0, "Batch transform failed");
        }
        return mockItems;
      };

      await processorService.processBatch(mockItems, config);

      // Should distribute original items
      expect(mockDistributionService.distributedItems[0].content).toEqual(
        mockItems,
      );
    });

    it("should handle individual item processing failures", async () => {
      const config = {
        transform: [{ plugin: "item", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      let callCount = 0;
      mockTransformationService.applyTransforms = async (
        content: any,
        _transforms: TransformConfig[],
        stage: TransformStage,
      ) => {
        callCount++;
        if (callCount === 1) {
          throw new TransformError("test", stage, 0, "Item transform failed");
        }
        return { ...content, transformed: true };
      };

      await processorService.processBatch(mockItems, config);

      // Failed item should be included untransformed
      const distributedContent =
        mockDistributionService.distributedItems[0].content;
      expect(distributedContent).toHaveLength(2);
      expect(distributedContent[0]).toEqual(mockItems[0]); // Failed, original
      expect(distributedContent[1]).toEqual({
        ...mockItems[1],
        transformed: true,
      }); // Succeeded
    });

    it("should handle concurrent item processing failures", async () => {
      const mockItems = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        content: `test${i}`,
      }));
      const config = {
        transform: [{ plugin: "item", config: {} }],
        distribute: [{ plugin: "dist1", config: {} }],
      };

      mockTransformationService.applyTransforms = async (content: any) => {
        if (content.id % 2 === 0) {
          throw new TransformError(
            "test",
            "global",
            0,
            `Item ${content.id} transform failed`,
          );
        }
        return { ...content, transformed: true };
      };

      await processorService.processBatch(mockItems, config);

      const distributedContent =
        mockDistributionService.distributedItems[0].content;
      expect(distributedContent).toHaveLength(5);
      distributedContent.forEach((item: any, index: number) => {
        if (index % 2 === 0) {
          expect(item).toEqual(mockItems[index]); // Failed items remain unchanged
        } else {
          expect(item).toEqual({ ...mockItems[index], transformed: true }); // Succeeded items
        }
      });
    });
  });
});
