import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { swaggerUI } from "@hono/swagger-ui";
import dotenv from "dotenv";
import path from "path";
import { promises as fs } from "fs";
import configService, { validateEnv } from "./config/config";
import { loadRssPlugin } from "./external/plugin-loader";
import { db } from "./services/db";
import { DistributionService } from "./services/distribution/distribution.service";
import { SubmissionService } from "./services/submissions/submission.service";
import { TwitterService } from "./services/twitter/client";
import { testRoutes, mockTwitterService } from "./routes/test";
import {
  cleanup,
  failSpinner,
  logger,
  startSpinner,
  succeedSpinner,
} from "./utils/logger";

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
  let twitterService: TwitterService | null = null;
  let submissionService: SubmissionService | null = null;
  let distributionService: DistributionService | null = null;

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
    
    // Load RSS plugin dynamically
    try {
      const rssPlugin = await loadRssPlugin(db.getOperations());
      distributionService.registerPlugin("rss", rssPlugin);
      logger.info("RSS plugin loaded successfully");
    } catch (error) {
      logger.error("Failed to load RSS plugin:", error);
    }
    
    await distributionService.initialize(config.plugins);
    succeedSpinner("distribution-init", "distribution service initialized");

    // Use mock service in development, real service in production
    try {
      startSpinner("twitter-init", "Initializing Twitter service...");
      if (process.env.NODE_ENV === "development") {
        logger.info("Using mock Twitter service");
        twitterService = mockTwitterService;
        await twitterService.initialize();
      } else {
        twitterService = new TwitterService({
          username: process.env.TWITTER_USERNAME!,
          password: process.env.TWITTER_PASSWORD!,
          email: process.env.TWITTER_EMAIL!,
          twoFactorSecret: process.env.TWITTER_2FA_SECRET,
        });
        await twitterService.initialize();
      }
      succeedSpinner("twitter-init", "Twitter service initialized");

      // Initialize submission service
      startSpinner("submission-init", "Initializing submission service...");
      submissionService = new SubmissionService(
        twitterService,
        distributionService,
        config,
      );
      await submissionService.initialize();
      succeedSpinner("submission-init", "Submission service initialized");
    } catch (error) {
      failSpinner("twitter-init", "Failed to initialize Twitter service");
      logger.warn("Twitter service initialization failed:", error);
      logger.info("Continuing without Twitter integration");
    }

    // Initialize server
    startSpinner("server", "Starting server...");

    const app = new Hono();

    // Middleware
    app.use("*", honoLogger());
    app.use("*", cors({
      origin: ALLOWED_ORIGINS,
      allowMethods: ["GET", "POST"],
    }));
    app.use("*", secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: "cross-origin",
      xFrameOptions: "sameorigin",
    }));

    // Swagger UI
    app.use("/swagger/*", swaggerUI({ url: "/api/swagger.json" }));

    // Include test routes in development
    if (process.env.NODE_ENV === "development") {
      app.route("/", testRoutes);
    }

    app.get("/health", (c) => c.text("OK", 200))
      // API Routes
    app.get("/api/twitter/last-tweet-id", async (c) => {
      if (!twitterService) {
        throw new Error("Twitter service not available");
      }
      const lastTweetId = twitterService.getLastCheckedTweetId();
      return c.json({ lastTweetId });
    })
    app.post("/api/twitter/last-tweet-id", async (c) => {
      if (!twitterService) {
        throw new Error("Twitter service not available");
      }
      const body = await c.req.json();
      if (
        !body?.tweetId ||
        typeof body.tweetId !== "string" ||
        !body.tweetId.match(/^\d+$/)
      ) {
        throw new Error("Invalid tweetId format");
      }
      await twitterService.setLastCheckedTweetId(body.tweetId);
      return c.json({ success: true });
    })
    app.get("/api/submission/:submissionId", (c) => {
      const submissionId = c.req.param("submissionId");
      const content = db.getSubmission(submissionId);
      if (!content) {
        throw new Error(`Content not found: ${submissionId}`);
      }
      return c.json(content);
    })
    app.get("/api/submissions", (c) => {
      return c.json(db.getAllSubmissions());
    })
    app.get("/api/submissions/:feedId", (c) => {
      const feedId = c.req.param("feedId");
      const config = configService.getConfig();
      const feed = config.feeds.find(
        (f) => f.id.toLowerCase() === feedId.toLowerCase(),
      );
      if (!feed) {
        throw new Error(`Feed not found: ${feedId}`);
      }
      return c.json(db.getSubmissionsByFeed(feedId));
    })
    app.get("/api/feed/:feedId", (c) => {
      const feedId = c.req.param("feedId");
      const config = configService.getConfig();
      const feed = config.feeds.find(
        (f) => f.id.toLowerCase() === feedId.toLowerCase(),
      );
      if (!feed) {
        throw new Error(`Feed not found: ${feedId}`);
      }
      return c.json(db.getSubmissionsByFeed(feedId));
    })
    app.get("/api/config", async (c) => {
      const rawConfig = await configService.getRawConfig();
      return c.json(rawConfig);
    })
    app.get("/api/feeds", async (c) => {
      const rawConfig = await configService.getRawConfig();
      return c.json(rawConfig.feeds);
    })
    app.get("/api/config/:feedId", (c) => {
      const feedId = c.req.param("feedId");
      const config = configService.getConfig();
      const feed = config.feeds.find((f) => f.id === feedId);
      if (!feed) {
        throw new Error(`Feed not found: ${feedId}`);
      }
      return c.json(feed);
    })
    app.get("/plugin/rss/:feedId", (c) => {
      const feedId = c.req.param("feedId");
      if (!distributionService) {
        throw new Error("Distribution service not available");
      }
      const plugin = distributionService.getPlugin("rss");
      if (!plugin) {
        throw new Error("RSS plugin not found");
      }

      // Since we know this is an RSS plugin, we can safely cast it
      const rssPlugin = plugin as unknown as { getServices(): Map<string, { getItems(): any }> };
      const service = rssPlugin.getServices().get(feedId);
      if (!service) {
        throw new Error("RSS service not initialized for this feed");
      }

      return c.json(service.getItems());
    })
    // app.post("/api/feeds/:feedId/process", async (c) => {
    //   const feedId = c.req.param("feedId");
    //   // Get feed config
    //   const config = configService.getConfig();
    //   const feed = config.feeds.find((f) => f.id === feedId);
    //   if (!feed) {
    //     throw new Error(`Feed not found: ${feedId}`);
    //   }

    //   // Get approved submissions for this feed
    //   const submissions = db
    //     .getSubmissionsByFeed(feedId)
    //     .filter((sub) =>
    //       db
    //         .getFeedsBySubmission(sub.tweetId)
    //         .some((feed) => feed.status === "approved"),
    //     );

    //   if (submissions.length === 0) {
    //     return c.json({ processed: 0 });
    //   }

    //   // Process each submission through stream output
    //   let processed = 0;
    //   if (!distributionService) {
    //     throw new Error("Distribution service not available");
    //   }
    //   for (const submission of submissions) {
    //     try {
    //       await distributionService.processStreamOutput(
    //         feedId,
    //         submission.tweetId,
    //         submission.content,
    //       );
    //       processed++;
    //     } catch (error) {
    //       logger.error(
    //         `Error processing submission ${submission.tweetId}:`,
    //         error,
    //       );
    //     }
    //   }

    //   return c.json({ processed });
    // });
    // Serve static files
    app.use("/*", serveStatic({ root: FRONTEND_DIST_PATH }));
    
    // Serve index.html for all other routes (SPA fallback)
    app.get("/*", async (c) => {
      const content = await fs.readFile(`${FRONTEND_DIST_PATH}/index.html`, 'utf-8');
      return c.html(content);
    });

    // Start the server
    serve({
      fetch: app.fetch.bind(app),
      port: PORT,
      hostname: "0.0.0.0"
    });

    succeedSpinner("server", `Server running on port ${PORT}`);

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      startSpinner("shutdown", "Shutting down gracefully...");
      try {
        const shutdownPromises = [];
        if (twitterService) shutdownPromises.push(twitterService.stop());
        if (submissionService) shutdownPromises.push(submissionService.stop());
        if (distributionService)
          shutdownPromises.push(distributionService.shutdown());

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

    // Start checking for mentions only if Twitter service is available
    if (submissionService) {
      startSpinner("submission-monitor", "Starting submission monitoring...");
      await submissionService.startMentionsCheck();
      succeedSpinner("submission-monitor", "Submission monitoring started");
    }
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
