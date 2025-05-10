import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { logger } from "../../utils/logger";

// Define validation schema for the recap job payload
const recapJobSchema = z.object({
  feedId: z.string(),
  recapId: z.string(),
});

// Create a router for internal API endpoints
export const triggerRoutes = new Hono();

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
triggerRoutes.post(
  "/recap",
  zValidator("json", recapJobSchema),
  async (c) => {
    const { feedId, recapId } = c.req.valid("json");

    logger.info(`Received request to run recap: ${feedId}/${recapId}`);

    try {
      // TODO: need to handle schedulerService injection
      // await schedulerService.runRecapJob(feedId, recapId);
      return c.json({ success: true });
    } catch (error) {
      logger.error(`Error running recap job: ${feedId}/${recapId}`, error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return c.json({ error: errorMessage }, 500);
    }
  },
);

export default triggerRoutes;
