import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AppContext } from "../../types/app";
import { RecapConfig } from "../../types/recap";
import { logger } from "../../utils/logger";

// Create a router for recap API endpoints
export const recapRouter = new Hono<{ Variables: { context: AppContext } }>();

// Schema for validating recap configuration
const recapConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  schedule: z.string().min(1),
  timezone: z.string().optional(),
  transform: z
    .array(
      z.object({
        plugin: z.string(),
        config: z.record(z.any()),
      }),
    )
    .optional(),
  batchTransform: z
    .array(
      z.object({
        plugin: z.string(),
        config: z.record(z.any()),
      }),
    )
    .optional(),
  distribute: z
    .array(
      z.object({
        plugin: z.string(),
        config: z.record(z.string()),
        transform: z
          .array(
            z.object({
              plugin: z.string(),
              config: z.record(z.any()),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

// GET /api/feed/:feedId/recap
// Get all recap configurations for a feed
recapRouter.get("/:feedId/recap", async (c) => {
  const { feedId } = c.req.param();
  const { feedRepository } = c.get("context");

  try {
    const feedConfig = await feedRepository.getFeedConfig(feedId);
    if (!feedConfig) {
      return c.json({ error: "Feed not found" }, 404);
    }

    // Get recap states to include status information
    const recapStates = await feedRepository.getAllRecapStatesForFeed(feedId);

    // Combine recap configs with their states
    const recaps = feedConfig.outputs.recap || [];
    const recapsWithState = recaps.map((recap) => {
      const state = recapStates.find((s) => s.recapId === recap.id);
      return {
        ...recap,
        state: state
          ? {
              lastSuccessfulCompletion: state.lastSuccessfulCompletion,
              lastRunError: state.lastRunError,
            }
          : null,
      };
    });

    return c.json({ recaps: recapsWithState });
  } catch (error) {
    logger.error(`Error getting recap configs for feed ${feedId}:`, error);
    return c.json({ error: "Failed to get recap configurations" }, 500);
  }
});

// GET /api/feed/:feedId/recap/:recapIndex
// Get a specific recap configuration
recapRouter.get("/:feedId/recap/:recapIndex", async (c) => {
  const { feedId, recapIndex } = c.req.param();
  const recapIdx = parseInt(recapIndex, 10);
  const { feedRepository } = c.get("context");

  if (isNaN(recapIdx) || recapIdx < 0) {
    return c.json({ error: "Invalid recap index" }, 400);
  }

  try {
    const feedConfig = await feedRepository.getFeedConfig(feedId);
    if (!feedConfig) {
      return c.json({ error: "Feed not found" }, 404);
    }

    const recaps = feedConfig.outputs.recap || [];
    if (recapIdx >= recaps.length) {
      return c.json({ error: "Recap configuration not found" }, 404);
    }

    // Get recap state
    const recapId = recaps[recapIdx].id;
    const state = await feedRepository.getRecapState(feedId, recapId);

    return c.json({
      recap: {
        ...recaps[recapIdx],
        state: state
          ? {
              lastSuccessfulCompletion: state.lastSuccessfulCompletion,
              lastRunError: state.lastRunError,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error(
      `Error getting recap config ${recapIdx} for feed ${feedId}:`,
      error,
    );
    return c.json({ error: "Failed to get recap configuration" }, 500);
  }
});

// POST /api/feed/:feedId/recap
// Add a new recap configuration
recapRouter.post(
  "/:feedId/recap",
  zValidator("json", recapConfigSchema),
  async (c) => {
    const { feedId } = c.req.param();
    const recapConfig = c.req.valid("json");
    const { feedRepository, schedulerService } = c.get("context");

    try {
      const feedConfig = await feedRepository.getFeedConfig(feedId);
      if (!feedConfig) {
        return c.json({ error: "Feed not found" }, 404);
      }

      // Initialize recap array if it doesn't exist
      if (!feedConfig.outputs.recap) {
        feedConfig.outputs.recap = [];
      }

      // Add the new recap config
      feedConfig.outputs.recap.push(recapConfig);

      // Update feed config
      await feedRepository.updateFeedConfig(feedId, feedConfig);

      // Sync schedules to create the new job if enabled
      await schedulerService.syncFeedSchedules(feedId);

      return c.json({
        success: true,
        recapIndex: feedConfig.outputs.recap.length - 1,
      });
    } catch (error) {
      logger.error(`Error adding recap config for feed ${feedId}:`, error);
      return c.json({ error: "Failed to add recap configuration" }, 500);
    }
  },
);

// PUT /api/feed/:feedId/recap/:recapIndex
// Update a specific recap configuration
recapRouter.put(
  "/:feedId/recap/:recapIndex",
  zValidator("json", recapConfigSchema),
  async (c) => {
    const { feedId, recapIndex } = c.req.param();
    const recapIdx = parseInt(recapIndex, 10);
    const recapConfig = c.req.valid("json");
    const { feedRepository, schedulerService } = c.get("context");

    if (isNaN(recapIdx) || recapIdx < 0) {
      return c.json({ error: "Invalid recap index" }, 400);
    }

    try {
      const feedConfig = await feedRepository.getFeedConfig(feedId);
      if (!feedConfig) {
        return c.json({ error: "Feed not found" }, 404);
      }

      // Initialize recap array if it doesn't exist
      if (!feedConfig.outputs.recap) {
        feedConfig.outputs.recap = [];
      }

      // Check if recap exists
      if (recapIdx >= feedConfig.outputs.recap.length) {
        return c.json({ error: "Recap configuration not found" }, 404);
      }

      // Update the recap config
      feedConfig.outputs.recap[recapIdx] = recapConfig;

      // Update feed config
      await feedRepository.updateFeedConfig(feedId, feedConfig);

      // Sync schedules to update the job
      await schedulerService.syncFeedSchedules(feedId);

      return c.json({ success: true });
    } catch (error) {
      logger.error(
        `Error updating recap config ${recapIdx} for feed ${feedId}:`,
        error,
      );
      return c.json({ error: "Failed to update recap configuration" }, 500);
    }
  },
);

// DELETE /api/feed/:feedId/recap/:recapIndex
// Delete a specific recap configuration
recapRouter.delete("/:feedId/recap/:recapIndex", async (c) => {
  const { feedId, recapIndex } = c.req.param();
  const recapIdx = parseInt(recapIndex, 10);
  const { feedRepository, schedulerService } = c.get("context");

  if (isNaN(recapIdx) || recapIdx < 0) {
    return c.json({ error: "Invalid recap index" }, 400);
  }

  try {
    const feedConfig = await feedRepository.getFeedConfig(feedId);
    if (!feedConfig) {
      return c.json({ error: "Feed not found" }, 404);
    }

    // Check if recap exists
    if (
      !feedConfig.outputs.recap ||
      recapIdx >= feedConfig.outputs.recap.length
    ) {
      return c.json({ error: "Recap configuration not found" }, 404);
    }

    // Remove the recap config
    feedConfig.outputs.recap.splice(recapIdx, 1);

    // Update feed config
    await feedRepository.updateFeedConfig(feedId, feedConfig);

    // Sync schedules to delete the job
    await schedulerService.syncFeedSchedules(feedId);

    return c.json({ success: true });
  } catch (error) {
    logger.error(
      `Error deleting recap config ${recapIdx} for feed ${feedId}:`,
      error,
    );
    return c.json({ error: "Failed to delete recap configuration" }, 500);
  }
});

// POST /api/feed/:feedId/recap/:recapIndex/run
// Manually trigger a recap job
recapRouter.post("/:feedId/recap/:recapIndex/run", async (c) => {
  const { feedId, recapIndex } = c.req.param();
  const recapIdx = parseInt(recapIndex, 10);
  const { schedulerService, feedRepository } = c.get("context");

  if (isNaN(recapIdx) || recapIdx < 0) {
    return c.json({ error: "Invalid recap index" }, 400);
  }

  try {
    const feedConfig = await feedRepository.getFeedConfig(feedId);
    if (!feedConfig) {
      return c.json({ error: "Feed not found" }, 404);
    }

    const recaps = feedConfig.outputs.recap || [];
    if (recapIdx >= recaps.length) {
      return c.json({ error: "Recap configuration not found" }, 404);
    }

    const recapId = recaps[recapIdx].id;
    await schedulerService.runRecapJob(feedId, recapId);
    return c.json({ success: true });
  } catch (error) {
    logger.error(
      `Error running recap job ${recapIdx} for feed ${feedId}:`,
      error,
    );
    return c.json({ error: "Failed to run recap job" }, 500);
  }
});
