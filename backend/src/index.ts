import { loadEnvConfig } from "./utils/config";

loadEnvConfig();

import { serve } from "@hono/node-server";
import { AppInstance } from "types/app";
import { createApp } from "./app";
import { pool } from "./services/db";
import { ServiceProvider } from "./utils/service-provider";
import { IBackgroundTaskService } from "./services/interfaces/background-task.interface";
import {
  cleanup,
  createHighlightBox,
  createSection,
  logger,
} from "./utils/logger";

const PORT = Number(process.env.PORT) || 3000;

let instance: AppInstance | null = null;

async function getInstance(): Promise<AppInstance> {
  if (!instance) {
    try {
      instance = await createApp();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error(`Failed to create app instance: ${errorMessage}`, {
        error: errorMessage,
        stack: errorStack,
        dirname: __dirname,
        cwd: process.cwd(),
      });
      // console.error(errorMessage);
      throw new Error(`Failed to initialize application: ${errorMessage}`);
    }
  }
  return instance;
}

async function startServer() {
  try {
    createSection("⚡ STARTING SERVER ⚡");

    // getInstance now primarily ensures ServiceProvider is initialized via createApp
    const { app } = await getInstance();
    const sp = ServiceProvider.getInstance();

    // Add health check route
    app.get("/health", (c) => {
      // Services are now obtained from ServiceProvider
      const health = {
        status: "OK",
        timestamp: new Date().toISOString(),
        services: {
          // twitter: sp.getTwitterService() ? "up" : "down", // Assuming getTwitterService exists if needed
          submission: sp.getSubmissionService() ? "up" : "down",
          distribution: sp.getDistributionService() ? "up" : "down",
          source: sp.getSourceService() ? "up" : "down",
        },
      };
      return c.json(health);
    });

    // Start the server
    const server = serve({
      fetch: app.fetch,
      port: PORT,
    });

    // Create a multi-line message for the highlight box
    const serverMessage = [
      `🚀 SERVER RUNNING 🚀`,
      ``,
      `📡 Available at:`,
      `http://localhost:${PORT}`,
      ``,
      `✨ Ready and accepting connections`,
    ].join("\n");

    createHighlightBox(serverMessage);

    createSection("SERVICES");

    // Start all background task services
    const backgroundServices = sp.getBackgroundTaskServices();
    if (backgroundServices.length > 0) {
      logger.info(
        `Starting ${backgroundServices.length} background task service(s)...`,
      );
      for (const bgService of backgroundServices) {
        // Assuming service name can be inferred or logged by the service itself
        bgService
          .start()
          .catch((err) =>
            logger.error(
              `Error starting background service: ${err.message}`,
              err,
            ),
          );
      }
    } else {
      logger.info("No background task services configured to start.");
    }

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      createSection("🛑 SHUTTING DOWN 🛑");
      logger.info(`Graceful shutdown initiated (${signal})`);

      try {
        // Wait for server to close
        await new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        logger.info("HTTP server closed");

        const shutdownPromises = [];

        // Stop all background task services
        const bgServicesToStop = sp.getBackgroundTaskServices(); // Get fresh list in case it changed
        if (bgServicesToStop.length > 0) {
          logger.info(
            `Stopping ${bgServicesToStop.length} background task service(s)...`,
          );
          for (const bgService of bgServicesToStop) {
            shutdownPromises.push(
              bgService
                .stop()
                .catch((err) =>
                  logger.error(
                    `Error stopping background service: ${err.message}`,
                    err,
                  ),
                ),
            );
          }
        }

        // Handle other specific service shutdowns if they are not IBackgroundTaskService
        // For example, if twitterService and distributionService have specific shutdown logic
        // and are not managed by the IBackgroundTaskService loop.
        // const twitterService = sp.getTwitterService(); // Hypothetical
        // if (twitterService && typeof twitterService.stop === 'function') {
        //   shutdownPromises.push(twitterService.stop().then(() => logger.info("Twitter service stopped")));
        // }

        const distributionService = sp.getDistributionService();
        if (
          distributionService &&
          typeof distributionService.shutdown === "function"
        ) {
          shutdownPromises.push(
            distributionService
              .shutdown()
              .then(() => logger.info("Distribution service stopped")),
          );
        }

        // Database pool
        shutdownPromises.push(
          pool
            .end()
            .then(() => logger.info("Database connection pool closed.")),
        );

        await Promise.all(shutdownPromises);

        // Reset instance for clean restart
        instance = null;

        logger.info("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Handle manual shutdown (Ctrl+C) and SIGTERM
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    logger.error("Error during startup:", error);
    cleanup();
    process.exit(1);
  }
}

startServer();
