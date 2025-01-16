import dotenv from "dotenv";
import path from "path";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { DistributionService } from "services/distribution/distribution.service";
import configService, { validateEnv } from "./config/config";
import { db } from "./services/db";
import RssPlugin from "./external/rss";
import { SubmissionService } from "./services/submissions/submission.service";
import { TwitterService } from "./services/twitter/client";
import {
  cleanup,
  failSpinner,
  logger,
  startSpinner,
  succeedSpinner,
} from "./utils/logger";
import { ServerWebSocket } from "bun";

const PORT = Number(process.env.PORT) || 3000;

// Store active WebSocket connections
const activeConnections = new Set();

// Broadcast to all connected clients
export function broadcastUpdate(data: unknown) {
  const message = JSON.stringify(data);
  activeConnections.forEach((ws) => {
    try {
      (ws as ServerWebSocket).send(message);
    } catch (error) {
      logger.error("Error broadcasting to WebSocket client:", error);
      activeConnections.delete(ws);
    }
  });
}

export async function main() {
  try {
    // Load environment variables and config
    startSpinner("env", "Loading environment variables and config...");
    dotenv.config();
    validateEnv();
    await configService.loadConfig();
    succeedSpinner("env", "Environment variables and config loaded");

    // Initialize Twitter service
    startSpinner("twitter-init", "Initializing Twitter service...");
    const twitterService = new TwitterService({
      username: process.env.TWITTER_USERNAME!,
      password: process.env.TWITTER_PASSWORD!,
      email: process.env.TWITTER_EMAIL!,
      twoFactorSecret: process.env.TWITTER_2FA_SECRET
    });
    await twitterService.initialize();
    succeedSpinner("twitter-init", "Twitter service initialized");

    // Initialize distribution service
    startSpinner("distribution-init", "Initializing distribution service...");
    const distributionService = new DistributionService();
    const config = configService.getConfig();
    await distributionService.initialize(config.plugins);
    succeedSpinner("distribution-init", "distribution service initialized");

    // Initialize submission service
    startSpinner("submission-init", "Initializing submission service...");
    const submissionService = new SubmissionService(
      twitterService,
      distributionService,
      config,
    );
    await submissionService.initialize();
    succeedSpinner("submission-init", "Submission service initialized");

    // Initialize server
    startSpinner("server", "Starting server...");

    const app = new Elysia()
      .use(cors())
      .use(swagger())
      // WebSocket handling
      .ws("/ws", {
        open: (ws) => {
          activeConnections.add(ws);
          logger.debug(
            `WebSocket client connected. Total connections: ${activeConnections.size}`,
          );
        },
        close: (ws) => {
          activeConnections.delete(ws);
          logger.debug(
            `WebSocket client disconnected. Total connections: ${activeConnections.size}`,
          );
        },
        message: () => {
          // we don't care about two-way connection yet
        },
      })
      // API Routes
      .get("/api/last-tweet-id", () => {
        const lastTweetId = twitterService.getLastCheckedTweetId();
        return { lastTweetId };
      })
      .post("/api/last-tweet-id", async ({ body }) => {
        const data = body as Record<string, unknown>;
        if (!data?.tweetId || typeof data.tweetId !== "string") {
          throw new Error("Invalid tweetId");
        }
        await twitterService.setLastCheckedTweetId(data.tweetId);
        return { success: true };
      })
      .get("/api/submissions", ({ query }) => {
        const status = query?.status as
          | "pending"
          | "approved"
          | "rejected"
          | null;
        return status
          ? db.getSubmissionsByStatus(status)
          : db.getAllSubmissions();
      })
      .get("/api/feed/:hashtagId", ({ params: { hashtagId } }) => {
        const config = configService.getConfig();
        const feed = config.feeds.find((f) => f.id === hashtagId);
        if (!feed) {
          throw new Error(`Feed not found: ${hashtagId}`);
        }

        return db.getSubmissionsByFeed(hashtagId);
      })
      .get("/api/submissions/:hashtagId", ({ params: { hashtagId } }) => {
        const config = configService.getConfig();
        const feed = config.feeds.find((f) => f.id === hashtagId);
        if (!feed) {
          throw new Error(`Feed not found: ${hashtagId}`);
        }
        // this should be pending submissions
        return db.getSubmissionsByFeed(hashtagId);
      })
      .get("/api/approved", () => {
        return db.getSubmissionsByStatus("approved");
      })
      .get("/api/content/:contentId", ({ params: { contentId } }) => {
        const content = db.getContent(contentId);
        if (!content) {
          throw new Error(`Content not found: ${contentId}`);
        }
        return content;
      })
      .get("/api/feeds", () => {
        const config = configService.getConfig();
        return config.feeds;
      })
      .get("/api/config/:feedId", ({ params: { feedId } }) => {
        const config = configService.getConfig();
        const feed = config.feeds.find((f) => f.id === feedId);
        if (!feed) {
          throw new Error(`Feed not found: ${feedId}`);
        }
        return feed;
      })
      .get("/plugin/rss/:feedId", ({ params: { feedId } }) => {
        const rssPlugin = distributionService.getPlugin("rss");
        if (!rssPlugin || !(rssPlugin instanceof RssPlugin)) {
          throw new Error("RSS plugin not found or invalid");
        }
        
        const service = rssPlugin.getServices().get(feedId);
        if (!service) {
          throw new Error("RSS service not initialized for this feed");
        }
        
        return service.getItems();
      })
      .post("/api/feeds/:feedId/process", async ({ params: { feedId } }) => {
        // Get feed config
        const config = configService.getConfig();
        const feed = config.feeds.find((f) => f.id === feedId);
        if (!feed) {
          throw new Error(`Feed not found: ${feedId}`);
        }

        // Get approved submissions for this feed
        const submissions = db
          .getSubmissionsByFeed(feedId)
          .filter((sub) => sub.status === "approved");

        if (submissions.length === 0) {
          return { processed: 0 };
        }

        // Process each submission through stream output
        let processed = 0;
        for (const submission of submissions) {
          try {
            await distributionService.processStreamOutput(
              feedId,
              submission.tweetId,
              submission.content,
            );
            processed++;
          } catch (error) {
            logger.error(
              `Error processing submission ${submission.tweetId}:`,
              error,
            );
          }
        }

        return { processed };
      })
      // Static file serving in production
      .get("/*", async ({ request }) => {
        if (process.env.NODE_ENV === "production") {
          const url = new URL(request.url);
          const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
          const file = Bun.file(
            path.join(__dirname, "../../frontend/dist", filePath),
          );
          if (await file.exists()) {
            return new Response(file);
          }
          // Fallback to index.html for client-side routing
          return new Response(
            Bun.file(path.join(__dirname, "../../frontend/dist/index.html")),
          );
        }
        throw new Error("Not found");
      })
      .onError(({ error }) => {
        logger.error("Request error:", error);
        return new Response(
          JSON.stringify({
            error:
              error instanceof Error ? error.message : "Internal server error",
          }),
          {
            status:
              error instanceof Error && error.message === "Not found"
                ? 404
                : 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      })
      .listen(PORT);

    succeedSpinner("server", `Server running on port ${PORT}`);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      startSpinner("shutdown", "Shutting down gracefully...");
      try {
        await Promise.all([
          twitterService.stop(),
          submissionService.stop(),
          distributionService.shutdown(),
        ]);
        succeedSpinner("shutdown", "Shutdown complete");
        process.exit(0);
      } catch (error) {
        failSpinner("shutdown", "Error during shutdown");
        logger.error("Shutdown", error);
        process.exit(1);
      }
    });

    logger.info("🚀 Bot is running and ready for events");

    // Start checking for mentions
    startSpinner("submission-monitor", "Starting submission monitoring...");
    await submissionService.startMentionsCheck();
    succeedSpinner("submission-monitor", "Submission monitoring started");
  } catch (error) {
    // Handle any initialization errors
    [
      "env",
      "twitter-init",
      "distribution-init",
      "twitter-mentions",
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
logger.info("Starting Public Goods News Bot...");
main().catch((error) => {
  logger.error("Unhandled Exception", error);
  process.exit(1);
});
