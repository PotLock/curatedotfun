import { loadEnvConfig } from "./utils/config";

loadEnvConfig();

import { serve } from "@hono/node-server";
import { AppInstance } from "types/app";
import { createApp } from "./app";
import { dbConnection } from "./services/db";
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

/**
 * Initialize the database connection
 * @returns Promise<boolean> - true if connection was successful
 */
async function initializeDatabaseConnection(): Promise<boolean> {
  logger.info("Initializing database connection...");

  try {
    await dbConnection.connect();
    return true;
  } catch (error) {
    // Check if it's a DATABASE_URL error
    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      logger.error("DATABASE_URL environment variable is not set or invalid");
      logger.error(
        "Please check your .env file and ensure DATABASE_URL is correctly configured",
      );
      logger.error(`Current working directory: ${process.cwd()}`);
    } else {
      logger.error(
        "Database connection failed. Application cannot continue without database.",
      );
    }
    return false;
  }
}

async function startServer() {
  try {
    createSection("⚡ STARTING SERVER ⚡");

    const dbConnected = await initializeDatabaseConnection();
    if (!dbConnected) {
      logger.error("Exiting application due to database connection failure");
      process.exit(1);
    }

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

    // Start checking for mentions only if Twitter service is available
    if (context.submissionService) {
      await context.submissionService.startMentionsCheck();
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
        if (context.twitterService) {
          shutdownPromises.push(context.twitterService.stop());
          logger.info("Twitter service stopped");
        }

        if (context.submissionService) {
          shutdownPromises.push(context.submissionService.stop());
          logger.info("Submission service stopped");
        }

        if (context.distributionService) {
          shutdownPromises.push(context.distributionService.shutdown());
          logger.info("Distribution service stopped");
        }

        shutdownPromises.push(dbConnection.disconnect());

        await Promise.all(shutdownPromises);
        logger.info("Database connections closed");

        // Reset instance for clean restart
        instance = null;

        logger.info("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Handle manual shutdown (Ctrl+C)
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Error during startup:", error);
    cleanup();
    process.exit(1);
  }
}

startServer();
