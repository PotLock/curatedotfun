import { Hono } from "hono";
import { Context, Next } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import { z } from "zod";
import { readFile } from "fs/promises";
import path from "path";
import { mockTwitterService, testRoutes } from "./routes/test";
import { ConfigService, isProduction } from "./services/config/config.service";
import { db } from "./services/db";
import { DistributionService } from "./services/distribution/distribution.service";
import { ProcessorService } from "./services/processor/processor.service";
import { PluginService } from "./services/plugins/plugin.service";
import { TransformationService } from "./services/transformation/transformation.service";
import { SubmissionService } from "./services/submissions/submission.service";
import { TwitterService } from "./services/twitter/client";
import { logger } from "./utils/logger";
import { zValidator } from "@hono/zod-validator";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173", // Dev server
  "https://curatedotfun-floral-sun-1539.fly.dev",
];

export interface AppContext {
  twitterService: TwitterService | null;
  submissionService: SubmissionService | null;
  distributionService: DistributionService | null;
  processorService: ProcessorService | null;
  configService: ConfigService;
}

type ValidatedRequest = {
  json: {
    tweetId: string;
  };
  query: {
    limit?: string;
    offset?: string;
  };
};

export interface AppInstance {
  app: Hono<{
    Variables: {
      context: AppContext;
    };
    Validators: ValidatedRequest;
  }>;
  context: AppContext;
}

export async function createApp(): Promise<AppInstance> {
  // Initialize services
  const configService = ConfigService.getInstance();
  await configService.loadConfig();

  const pluginService = PluginService.getInstance();
  const distributionService = new DistributionService(pluginService);
  const transformationService = new TransformationService(pluginService);
  const processorService = new ProcessorService(
    transformationService,
    distributionService,
  );

  let twitterService: TwitterService | null = null;
  if (isProduction) {
    twitterService = new TwitterService({
      username: process.env.TWITTER_USERNAME!,
      password: process.env.TWITTER_PASSWORD!,
      email: process.env.TWITTER_EMAIL!,
      twoFactorSecret: process.env.TWITTER_2FA_SECRET,
    });
    await twitterService.initialize();
  } else {
    // use mock service
    twitterService = mockTwitterService;
    await twitterService.initialize();
  }

  const submissionService = twitterService
    ? new SubmissionService(
        twitterService,
        processorService,
        configService.getConfig(),
      )
    : null;

  const context: AppContext = {
    twitterService,
    submissionService,
    distributionService,
    processorService,
    configService,
  };

  // Create Hono app with middleware
  const app = new Hono<{
    Variables: {
      context: AppContext;
    };
    Validators: ValidatedRequest;
  }>();

  // Add context to app
  app.use("*", async (c, next) => {
    c.set("context", context);
    await next();
  });

  // Middleware
  app.use("*", secureHeaders());
  app.use("*", cors({
    origin: ALLOWED_ORIGINS,
    allowMethods: ["GET", "POST"],
  }));

  // Test routes in development
  if (!isProduction) {
    app.route("/api/test", testRoutes);
  }

  // API Routes
  app.get("/api/twitter/last-tweet-id", (c) => {
    const context = c.get("context") as AppContext;
    if (!context.twitterService) {
      throw new Error("Twitter service not available");
    }
    const lastTweetId = context.twitterService.getLastCheckedTweetId();
    return c.json({ lastTweetId });
  });

  app.post(
    "/api/twitter/last-tweet-id",
    zValidator("json", z.object({
      tweetId: z.string().regex(/^\d+$/),
    })),
    async (c) => {
      const context = c.get("context") as AppContext;
      if (!context.twitterService) {
        throw new Error("Twitter service not available");
      }
      const { tweetId } = c.req.valid("json");
      await context.twitterService.setLastCheckedTweetId(tweetId);
      return c.json({ success: true });
    }
  );

  app.get("/api/submission/:submissionId", async (c) => {
    const submissionId = c.req.param("submissionId");
    const content = await db.getSubmission(submissionId);
    if (!content) {
      throw new Error(`Content not found: ${submissionId}`);
    }
    return c.json(content);
  });

  app.get(
    "/api/submissions",
    zValidator("query", z.object({
      limit: z.string().regex(/^\d+$/).optional(),
      offset: z.string().regex(/^\d+$/).optional(),
    })),
    async (c) => {
      const { limit, offset } = c.req.valid("query");
      return c.json(await db.getAllSubmissions(
        limit ? parseInt(limit) : undefined,
        offset ? parseInt(offset) : undefined
      ));
    }
  );

  app.get("/api/submissions/:feedId", async (c) => {
    const context = c.get("context") as AppContext;
    const feedId = c.req.param("feedId");
    const status = c.req.query("status");

    const feed = context.configService.getFeedConfig(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }
    let submissions = await db.getSubmissionsByFeed(feedId);
    if (status) {
      submissions = submissions.filter((sub) => sub.status === status);
    }
    return c.json(submissions);
  });

  app.get("/api/feed/:feedId", async (c) => {
    const context = c.get("context") as AppContext;
    const feedId = c.req.param("feedId");
    
    const feed = context.configService.getFeedConfig(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    return c.json(await db.getSubmissionsByFeed(feedId));
  });

  app.get("/api/config", async (c) => {
    const context = c.get("context") as AppContext;
    const rawConfig = await context.configService.getRawConfig();
    return c.json(rawConfig);
  });

  app.get("/api/feeds", async (c) => {
    const context = c.get("context") as AppContext;
    const rawConfig = await context.configService.getRawConfig();
    return c.json(rawConfig.feeds);
  });

  app.get("/api/config/:feedId", (c) => {
    const context = c.get("context") as AppContext;
    const feedId = c.req.param("feedId");
    
    const feed = context.configService.getFeedConfig(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }
    return c.json(feed);
  });

  app.post("/api/feeds/:feedId/process", async (c) => {
    const context = c.get("context") as AppContext;
    const feedId = c.req.param("feedId");
    
    const feed = context.configService.getFeedConfig(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    // Get approved submissions for this feed
    const submissions = await db.getSubmissionsByFeed(feedId);
    const approvedSubmissions = submissions.filter(
      (sub) => sub.status === "approved",
    );

    if (approvedSubmissions.length === 0) {
      return c.json({ processed: 0 });
    }

    // Process each submission through stream output
    let processed = 0;
    if (!context.processorService) {
      throw new Error("Processor service not available");
    }
    for (const submission of approvedSubmissions) {
      try {
        if (feed.outputs.stream) {
          await context.processorService.process(
            submission,
            feed.outputs.stream,
          );
          processed++;
        }
      } catch (error) {
        logger.error(
          `Error processing submission ${submission.tweetId}:`,
          error,
        );
      }
    }

    return c.json({ processed });
  });

  // Serve frontend in production, proxy to dev server in development
  if (isProduction) {
    app.use("/*", serveStatic({ root: path.join(__dirname, "public") }));
    app.get("/*", async (c) => {
      const filePath = path.join(__dirname, "public/index.html");
      const content = await readFile(filePath, 'utf-8');
      return c.html(content);
    });
  }

  return { app, context };
}
