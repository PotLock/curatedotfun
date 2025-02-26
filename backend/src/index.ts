import "dotenv/config";
import { serve } from "@hono/node-server";
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
    try {
      instance = await createApp();
    } catch (error) {
      logger.error("Failed to create app instance:", error);
      throw new Error("Failed to initialize application");
    }
  }
  return instance;
}

async function startServer() {
  try {
    startSpinner("server", "Starting server...");

    const { app, context } = await getInstance();

    // Add health check route
    app.get("/health", (c) => {
      const health = {
        status: "OK",
        timestamp: new Date().toISOString(),
        services: {
          twitter: context.twitterService ? "up" : "down",
          submission: context.submissionService ? "up" : "down",
          distribution: context.distributionService ? "up" : "down",
        },
      };
      return c.json(health);
    });

    // Start the server
    const server = serve({
      fetch: app.fetch,
      port: PORT,
    });

    succeedSpinner("server", `Server running on port ${PORT}`);

    // Start checking for mentions only if Twitter service is available
    if (context.submissionService) {
      startSpinner("submission-monitor", "Starting submission monitoring...");
      await context.submissionService.startMentionsCheck();
      succeedSpinner("submission-monitor", "Submission monitoring started");
    }

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      startSpinner("shutdown", `Shutting down gracefully (${signal})...`);
      try {
        // Wait for server to close
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });

        const shutdownPromises = [];
        if (context.twitterService)
          shutdownPromises.push(context.twitterService.stop());
        if (context.submissionService)
          shutdownPromises.push(context.submissionService.stop());
        if (context.distributionService)
          shutdownPromises.push(context.distributionService.shutdown());

        await Promise.all(shutdownPromises);
        succeedSpinner("shutdown", "Shutdown complete");

        // Reset instance for clean restart
        instance = null;

        process.exit(0);
      } catch (error) {
        failSpinner("shutdown", "Error during shutdown");
        logger.error("Shutdown", error);
        process.exit(1);
      }
    };

    // Handle manual shutdown (Ctrl+C)
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));

    logger.info("🚀 Server is running and ready");
  } catch (error) {
    // Handle any initialization errors
    ["server", "submission-monitor"].forEach((key) => {
      failSpinner(key, `Failed during ${key}`);
    });
    logger.error("Startup", error);
    cleanup();
    process.exit(1);
  }
}

startServer();
