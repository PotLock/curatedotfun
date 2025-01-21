import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import dotenv from "dotenv";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";
import path from "path";
import { InboundService } from "services/inbound/inbound.service";
import configService, { validateEnv } from "./config/config";
import RssPlugin from "./external/rss";
import { db } from "./services/db";
import { DistributionService } from "./services/distribution/distribution.service";
import {
  cleanup,
  failSpinner,
  logger,
  startSpinner,
  succeedSpinner,
} from "./utils/logger";
import { SubmissionStatus } from "types/twitter";

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_DIST_PATH =
  process.env.FRONTEND_DIST_PATH ||
  path.join(process.cwd(), "../frontend/dist");

// Configuration
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://curatedotfun-floral-sun-1539.fly.dev",
];

export async function main() {
  let distributionService: DistributionService | null = null;
  let inboundService: InboundService | null = null;

  try {
    // Load environment variables and config
    startSpinner("env", "Loading environment variables and config...");
    dotenv.config();
    validateEnv();
    await configService.loadConfig();
    succeedSpinner("env", "Environment variables and config loaded");

    // Initialize distribution service
    startSpinner("distribution-init", "Initializing distribution service...");
    distributionService = new DistributionService();
    const config = configService.getConfig();
    await distributionService.initialize(config.plugins);
    succeedSpinner("distribution-init", "distribution service initialized");

    // Initialize inbound service
    startSpinner("inbound-init", "Initializing inbound service...");
    inboundService = new InboundService(distributionService, config);
    await inboundService.initialize();
    succeedSpinner("inbound-init", "Inbound service initialized");

    // Initialize server
    startSpinner("server", "Starting server...");

    const app = new Elysia()
      .use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"], // Allow images from HTTPS sources
              fontSrc: ["'self'", "data:", "https:"], // Allow fonts
            },
          },
          crossOriginEmbedderPolicy: false, // Required for some static assets
          crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resources to be shared
          xFrameOptions: { action: "sameorigin" },
        }),
      )
      .use(
        cors({
          origin: ALLOWED_ORIGINS,
          methods: ["GET", "POST"],
        }),
      )
      .use(swagger())
      .get("/health", () => new Response("OK", { status: 200 }))
      // API Routes
      .get(
        "/api/submission/:submissionId",
        ({
          params: { submissionId },
        }: {
          params: { submissionId: string };
        }) => {
          const content = db.getSubmission(submissionId);
          if (!content) {
            throw new Error(`Content not found: ${submissionId}`);
          }
          return content;
        },
      )
      .get("/api/submissions", () => {
        return db.getAllSubmissions();
      })
      .get(
        "/api/submissions/:feedId",
        ({ params: { feedId } }: { params: { feedId: string } }) => {
          const config = configService.getConfig();
          const feed = config.feeds.find((f) => f.id === feedId);
          if (!feed) {
            throw new Error(`Feed not found: ${feedId}`);
          }
          return db.getSubmissionsByFeed(feedId);
        },
      )
      .get(
        "/api/feed/:feedId",
        ({ params: { feedId } }: { params: { feedId: string } }) => {
          const config = configService.getConfig();
          const feed = config.feeds.find((f) => f.id === feedId);
          if (!feed) {
            throw new Error(`Feed not found: ${feedId}`);
          }

          return db.getSubmissionsByFeed(feedId);
        },
      )
      .get("/api/config", () => {
        const config = configService.getConfig();
        return config;
      })
      .get(
        "/api/config/:feedId",
        ({ params: { feedId } }: { params: { feedId: string } }) => {
          const config = configService.getConfig();
          const feed = config.feeds.find((f) => f.id === feedId);
          if (!feed) {
            throw new Error(`Feed not found: ${feedId}`);
          }
          return feed;
        },
      )
      .get(
        "/plugin/rss/:feedId",
        ({ params: { feedId } }: { params: { feedId: string } }) => {
          if (!distributionService) {
            throw new Error("Distribution service not available");
          }
          const rssPlugin = distributionService.getPlugin("rss");
          if (!rssPlugin || !(rssPlugin instanceof RssPlugin)) {
            throw new Error("RSS plugin not found or invalid");
          }

          const service = rssPlugin.getServices().get(feedId);
          if (!service) {
            throw new Error("RSS service not initialized for this feed");
          }

          return service.getItems();
        },
      )
      .post(
        "/api/feeds/:feedId/process",
        async ({ params: { feedId } }: { params: { feedId: string } }) => {
          // Get feed config
          const config = configService.getConfig();
          const feed = config.feeds.find((f) => f.id === feedId);
          if (!feed) {
            throw new Error(`Feed not found: ${feedId}`);
          }

          // Get approved submissions for this feed
          const submissions = db
            .getSubmissionsByFeed(feedId)
            .filter((sub) =>
              db
                .getFeedsBySubmission(sub.id)
                .some((feed) => feed.status === SubmissionStatus.APPROVED),
            );

          if (submissions.length === 0) {
            return { processed: 0 };
          }

          // Process each submission through stream output
          let processed = 0;
          if (!distributionService) {
            throw new Error("Distribution service not available");
          }
          for (const submission of submissions) {
            try {
              // Format submission for display (temp solution)
              const formatted = {
                content: typeof submission.data.content === 'string' 
                  ? submission.data.content 
                  : JSON.stringify(submission.data.content)
              };

              await distributionService.processStreamOutput(
                feedId,
                submission.id,
                formatted.content,
              );
              processed++;
            } catch (error) {
              logger.error(
                `Error processing submission ${submission.id}:`,
                error,
              );
            }
          }

          return { processed };
        },
      )
      // This was the most annoying thing to set up and debug. Serves our frontend and handles routing. alwaysStatic is essential.
      .use(
        staticPlugin({
          assets: FRONTEND_DIST_PATH,
          prefix: "/",
          alwaysStatic: true,
        }),
      )
      .get("/*", () => Bun.file(`${FRONTEND_DIST_PATH}/index.html`))
      .listen({
        port: PORT,
        hostname: "0.0.0.0",
      });

    succeedSpinner("server", `Server running on port ${PORT}`);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      startSpinner("shutdown", "Shutting down gracefully...");
      try {
        const shutdownPromises = [];
        if (inboundService) shutdownPromises.push(inboundService.stop());
        if (distributionService) shutdownPromises.push(distributionService.shutdown());

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

    // Start monitoring for submissions
    startSpinner("submission-monitor", "Starting submission monitoring...");
    await inboundService.startMonitoring();
    succeedSpinner("submission-monitor", "Submission monitoring started");
  } catch (error) {
    // Handle any initialization errors
    [
      "env",
      "twitter-init",
      "distribution-init",
      "submission-monitor",
      "server",
    ].forEach((key) => {
      failSpinner(key, `Failed during ${key}`);
    });
    logger.error("Startup", error);
    cleanup();
    process.exit(1);
  }
}

// Start the application
logger.info("Starting application...");
main().catch((error) => {
  logger.error("Unhandled Exception", error);
  process.exit(1);
});
