import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { logger } from "../../utils/logger";
import { Env } from "../../types/app";
import { ServiceProvider } from "../../utils/service-provider";

// Define validation schema for the recap job payload
const recapJobSchema = z.object({
  feedId: z.string(),
  recapId: z.string(),
});

// Create a router for internal API endpoints
export const triggerRoutes = new Hono<Env>();

// TODO: Middleware to validate API token
// internalRouter.use(async (c, next) => {
//   const apiToken = c.req.header("X-API-Token");
//   const expectedToken = process.env.INTERNAL_API_TOKEN;

//   if (!expectedToken || apiToken !== expectedToken) {
//     logger.warn("Unauthorized access attempt to internal API");
//     return c.json({ error: "Unauthorized" }, 401);
//   }

//   await next();
// });

// POST /api/trigger/recap
// Endpoint for the scheduler to trigger recap jobs
triggerRoutes.post("/recap", zValidator("json", recapJobSchema), async (c) => {
  const { feedId, recapId } = c.req.valid("json");

  logger.info(`Received request to run recap: ${feedId}/${recapId}`);

  try {
    // TODO: need to handle schedulerService injection
    const sp = ServiceProvider.getInstance();
    const schedulerService = sp.getSchedulerService();
    // await schedulerService.runRecapJob(feedId, recapId); // This specific method call might need review based on SchedulerService capabilities
    return c.json({
      success: true,
      message:
        "Recap trigger acknowledged. Processing will be handled by SchedulerService.",
    });
  } catch (error) {
    logger.error(`Error running recap job: ${feedId}/${recapId}`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// POST /api/trigger/ingest/:feedId
// Endpoint for the scheduler to trigger ingestion jobs for a specific feed
triggerRoutes.post("/ingest/:feedId", async (c) => {
  const feedId = c.req.param("feedId");
  if (!feedId) {
    return c.json({ error: "feedId is required" }, 400);
  }

  logger.info(`Received request to ingest sources for feed: ${feedId}`);

  try {
    const sp = ServiceProvider.getInstance();
    const schedulerService = sp.getSchedulerService();
    await schedulerService.processFeedSources(feedId);
    logger.info(`Successfully triggered source ingestion for feed: ${feedId}`);
    return c.json({ message: `Ingestion triggered for feed ${feedId}` }, 202);
  } catch (error) {
    logger.error(`Error triggering ingestion for feed ${feedId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { error: `Failed to trigger ingestion: ${errorMessage}` },
      500,
    );
  }
});

export default triggerRoutes;
