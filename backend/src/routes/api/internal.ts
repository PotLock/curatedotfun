import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { SchedulerService } from "../../services/scheduler/scheduler.service";
import { logger } from "../../utils/logger";

// Define validation schema for the recap job payload
const recapJobSchema = z.object({
  feedId: z.string(),
  recapId: z.string(),
});

// Create a router for internal API endpoints
export const internalRouter = new Hono();

/**
 * Initialize the internal router with required services
 */
export function initializeInternalRouter(schedulerService: SchedulerService) {
  // Middleware to validate API token
  // TODO: This is a simple example - in production, use a more secure approach
  internalRouter.use(async (c, next) => {
    const apiToken = c.req.header("X-API-Token");
    const expectedToken = process.env.INTERNAL_API_TOKEN;

    if (!expectedToken || apiToken !== expectedToken) {
      logger.warn("Unauthorized access attempt to internal API");
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });

  // POST /api/internal/run-recap
  // Endpoint for the scheduler to trigger recap jobs
  internalRouter.post(
    "/run-recap",
    zValidator("json", recapJobSchema),
    async (c) => {
      const { feedId, recapId } = c.req.valid("json");

      logger.info(`Received request to run recap: ${feedId}/${recapId}`);

      try {
        await schedulerService.runRecapJob(feedId, recapId);
        return c.json({ success: true });
      } catch (error) {
        logger.error(`Error running recap job: ${feedId}/${recapId}`, error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return c.json({ error: errorMessage }, 500);
      }
    },
  );

  return internalRouter;
}
