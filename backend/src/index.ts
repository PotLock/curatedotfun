import { loadEnvConfig } from "./utils/config";

loadEnvConfig();

import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { pool } from "./services/db";
import {
  cleanup,
  createHighlightBox,
  createSection,
  logger,
} from "./utils/logger";
import { ServiceProvider } from "./utils/service-provider";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    createSection("⚡ STARTING SERVER ⚡");

    const { app } = await createApp();
    const sp = ServiceProvider.getInstance();

    app.get("/health", (c) => {
      const health = {
        status: "OK",
        timestamp: new Date().toISOString()
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
