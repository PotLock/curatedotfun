import { loadEnvConfig } from "./utils/config";

loadEnvConfig();

import { serve } from "@hono/node-server";
import { AppInstance } from "types/app";
import { createApp } from "./app";
import { pool } from "./services/db";
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

        shutdownPromises.push(
          pool.end().then(() => logger.info("Database connection pool closed."))
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
