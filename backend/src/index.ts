import "dotenv/config";
import { AppInstance, createApp } from "./app";
import {
  cleanup,
  failSpinner,
  logger,
  startSpinner,
  succeedSpinner,
} from "./utils/logger";

const PORT = Number(process.env.PORT) || 3000;

let instance: AppInstance | null = null;

async function getInstance(): Promise<AppInstance> {
  if (!instance) {
    instance = await createApp();
  }
  return instance;
}

async function startServer() {
  try {
    startSpinner("server", "Starting server...");
    
    const { app, context } = await getInstance();
    
    Bun.serve({
      port: PORT,
      hostname: "0.0.0.0",
      fetch: (request) => app.fetch(request)
    });
    succeedSpinner("server", `Server running on port ${PORT}`);

    // Start checking for mentions only if Twitter service is available
    if (context.submissionService) {
      startSpinner("submission-monitor", "Starting submission monitoring...");
      await context.submissionService.startMentionsCheck();
      succeedSpinner("submission-monitor", "Submission monitoring started");
    }

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      startSpinner("shutdown", "Shutting down gracefully...");
      try {
        const shutdownPromises = [];
        if (context.twitterService) shutdownPromises.push(context.twitterService.stop());
        if (context.submissionService) shutdownPromises.push(context.submissionService.stop());
        if (context.distributionService) shutdownPromises.push(context.distributionService.shutdown());

        await Promise.all(shutdownPromises);
        succeedSpinner("shutdown", "Shutdown complete");
        process.exit(0);
      } catch (error) {
        failSpinner("shutdown", "Error during shutdown");
        logger.error("Shutdown", error);
        process.exit(1);
      }
    });

    logger.info("🚀 Server is running and ready");
  } catch (error) {
    // Handle any initialization errors
    [
      "server",
      "submission-monitor",
    ].forEach((key) => {
      failSpinner(key, `Failed during ${key}`);
    });
    logger.error("Startup", error);
    cleanup();
    process.exit(1);
  }
}

startServer();
