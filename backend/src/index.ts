// Load environment variables from the appropriate .env file
import { config } from "dotenv";
import path from "path";

if (process.env.NODE_ENV === "test") {
  config({ path: path.resolve(process.cwd(), "backend/.env.test") });
} else {
  config({ path: path.resolve(process.cwd(), "backend/.env") });
}

// Log all environment variables for debugging
console.log("Environment variables loaded:");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);

import { serve } from "@hono/node-server";
import { AppInstance } from "types/app";
import { createApp } from "./app";
import { db, initializeDatabase } from "./services/db";
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error("Failed to create app instance:", { 
        error: errorMessage,
        stack: errorStack,
        dirname: __dirname,
        cwd: process.cwd()
      });
      throw new Error(`Failed to initialize application: ${errorMessage}`);
    }
  }
  return instance;
}

async function startServer() {
  try {
    createSection("⚡ STARTING SERVER ⚡");

    // Initialize database in production, but not in tests
    if (process.env.NODE_ENV !== "test") {
      logger.info("Initializing database connection...");
      try {
        const dbInitialized = await initializeDatabase();
        if (dbInitialized) {
          logger.info("Database connection established successfully");
        } else {
          logger.error("Database connection failed. Application cannot continue without database.");
          
          // Check if DATABASE_URL is set
          if (!process.env.DATABASE_URL) {
            logger.error("DATABASE_URL environment variable is not set");
          } else {
            logger.error("DATABASE_URL is set but connection failed. Check if the database server is running and accessible.");
            logger.error("Make sure Docker is running and the PostgreSQL container is started.");
          }
          
          // Exit the application
          logger.error("Exiting application due to database connection failure");
          process.exit(1);
        }
      } catch (dbError) {
        logger.error("Error during database initialization:", dbError);
        logger.error("Application cannot continue without database. Exiting...");
        process.exit(1);
      }
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

        shutdownPromises.push(db.disconnect());

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
