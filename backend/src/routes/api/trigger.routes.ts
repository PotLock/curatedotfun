import { Hono } from "hono";
import { logger } from "../../utils/logger";
import { RuleEngineService } from "../../services/rules/rule.engine.service";
import { getAppContext } from "../../core/appContext";
import { RuleProcessingResult } from "../../core/rules/rules.types";

const triggerRoutes = new Hono();

/**
 * Trigger processing of a specific rule
 * POST /api/trigger/search/:ruleId
 */
triggerRoutes.post("/search/:ruleId", async (c) => {
  const { ruleId } = c.req.param();
  const appContext = getAppContext(c);
  const ruleEngineService = appContext.ruleEngineService;

  if (!ruleEngineService) {
    logger.error("RuleEngineService not found in AppContext");
    return c.json(
      {
        success: false,
        message: "Rule engine service not available",
      },
      500
    );
  }

  try {
    // Process the rule
    const result = await ruleEngineService.processRule(ruleId);

    return c.json({
      success: result.success,
      message: result.message,
      processedItems: result.processedItems,
    });
  } catch (error) {
    logger.error(`Error processing rule ${ruleId}:`, error);
    return c.json(
      {
        success: false,
        message: `Failed to process rule ${ruleId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      500
    );
  }
});

/**
 * Trigger processing of all enabled rules
 * POST /api/trigger/search
 */
triggerRoutes.post("/search", async (c) => {
  const appContext = getAppContext(c);
  const ruleEngineService = appContext.ruleEngineService;

  if (!ruleEngineService) {
    logger.error("RuleEngineService not found in AppContext");
    return c.json(
      {
        success: false,
        message: "Rule engine service not available",
      },
      500
    );
  }

  try {
    // Process all enabled rules
    const results = await ruleEngineService.processAllRules();

    // Summarize results
    const successCount = results.filter((r: RuleProcessingResult) => r.success).length;
    const totalProcessedItems = results.reduce(
      (sum: number, r: RuleProcessingResult) => sum + r.processedItems,
      0
    );

    return c.json({
      success: true,
      message: `Processed ${results.length} rules (${successCount} succeeded)`,
      processedItems: totalProcessedItems,
      results: results.map((r: RuleProcessingResult) => ({
        ruleId: r.ruleId,
        success: r.success,
        message: r.message,
        processedItems: r.processedItems,
      })),
    });
  } catch (error) {
    logger.error("Error processing rules:", error);
    return c.json(
      {
        success: false,
        message: `Failed to process rules: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      500
    );
  }
});

/**
 * Get the current state of last processed IDs
 * GET /api/trigger/state
 */
triggerRoutes.get("/state", async (c) => {
  const appContext = getAppContext(c);
  const ruleEngineService = appContext.ruleEngineService;

  if (!ruleEngineService) {
    logger.error("RuleEngineService not found in AppContext");
    return c.json(
      {
        success: false,
        message: "Rule engine service not available",
      },
      500
    );
  }

  try {
    const lastProcessedInfo = ruleEngineService.getLastProcessedInfo();
    
    // Convert Map to object for JSON response
    const state: Record<string, string> = {};
    lastProcessedInfo.forEach((value: string, key: string) => {
      state[key] = value;
    });

    return c.json({
      success: true,
      state,
    });
  } catch (error) {
    logger.error("Error getting rule engine state:", error);
    return c.json(
      {
        success: false,
        message: `Failed to get rule engine state: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      500
    );
  }
});

/**
 * Clear the state of last processed IDs
 * DELETE /api/trigger/state
 */
triggerRoutes.delete("/state", async (c) => {
  const appContext = getAppContext(c);
  const ruleEngineService = appContext.ruleEngineService;

  if (!ruleEngineService) {
    logger.error("RuleEngineService not found in AppContext");
    return c.json(
      {
        success: false,
        message: "Rule engine service not available",
      },
      500
    );
  }

  try {
    ruleEngineService.clearLastProcessedInfo();

    return c.json({
      success: true,
      message: "Rule engine state cleared",
    });
  } catch (error) {
    logger.error("Error clearing rule engine state:", error);
    return c.json(
      {
        success: false,
        message: `Failed to clear rule engine state: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      500
    );
  }
});

/**
 * Set a specific last processed ID
 * PUT /api/trigger/state/:ruleId/:sourceId
 */
triggerRoutes.put("/state/:ruleId/:sourceId", async (c) => {
  const { ruleId, sourceId } = c.req.param();
  const appContext = getAppContext(c);
  const ruleEngineService = appContext.ruleEngineService;

  if (!ruleEngineService) {
    logger.error("RuleEngineService not found in AppContext");
    return c.json(
      {
        success: false,
        message: "Rule engine service not available",
      },
      500
    );
  }

  try {
    const body = await c.req.json();
    const { lastId } = body;

    if (!lastId) {
      return c.json(
        {
          success: false,
          message: "Missing lastId in request body",
        },
        400
      );
    }

    ruleEngineService.setLastProcessedId(ruleId, sourceId, lastId);

    return c.json({
      success: true,
      message: `Last processed ID for ${ruleId}:${sourceId} set to ${lastId}`,
    });
  } catch (error) {
    logger.error(`Error setting last processed ID for ${ruleId}:${sourceId}:`, error);
    return c.json(
      {
        success: false,
        message: `Failed to set last processed ID: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      500
    );
  }
});

export default triggerRoutes;
