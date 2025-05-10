import { SchedulerClient } from "@crosspost/scheduler-sdk";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import path from "path";
import { mockTwitterService } from "./routes/api/test";
import { configureStaticRoutes, staticRoutes } from "./routes/static";
import { ConfigService, isProduction } from "./services/config/config.service";
import { feedRepository } from "./services/db/repositories";
import { DistributionService } from "./services/distribution/distribution.service";
import { PluginService } from "./services/plugins/plugin.service";
import { ProcessorService } from "./services/processor/processor.service";
import { SchedulerService } from "./services/scheduler/scheduler.service";
import { SubmissionService } from "./services/submissions/submission.service";
import { TransformationService } from "./services/transformation/transformation.service";
import { TwitterService } from "./services/twitter/client";
import { AppContext, AppInstance, HonoApp } from "./types/app";
import { getAllowedOrigins } from "./utils/config";
import { errorHandler } from "./utils/error";

const ALLOWED_ORIGINS = getAllowedOrigins();

export async function createApp(): Promise<AppInstance> {
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
    // Use mock service in test and development
    // You can trigger the mock via the frontend's Test Panel
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

  if (submissionService) {
    submissionService.initialize();
  }

  // Initialize scheduler service
  const schedulerClient = new SchedulerClient({
    baseUrl: process.env.SCHEDULER_BASE_URL || "http://localhost:3001",
    headers: {
      Authorization: `Bearer ${process.env.SCHEDULER_API_TOKEN || ""}`,
    },
  });

  const backendUrl = process.env.CURATE_BACKEND_URL || "http://localhost:3000";
  const schedulerService = new SchedulerService(
    feedRepository,
    processorService,
    schedulerClient,
    backendUrl,
  );

  // Initialize scheduler on startup (non-blocking)
  // schedulerService.initialize().catch((err) => {
  //   console.error("Failed to initialize scheduler service:", err);
  // });

  const context: AppContext = {
    twitterService,
    submissionService,
    distributionService,
    processorService,
    configService,
    schedulerService,
    feedRepository,
  };

  // Create Hono app
  const app = HonoApp();

  // Set context (make services accessible to routes)
  app.use("*", async (c, next) => {
    c.set("context", context);
    await next();
  });

  // Handle errors
  app.onError((err, c) => {
    return errorHandler(err, c);
  });

  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Check if origin is in the allowed list
        if (ALLOWED_ORIGINS.includes(origin)) {
          return origin;
        }
        // Otherwise, allow same-origin requests (frontend)
        return origin;
      },
      allowMethods: ["GET", "POST"],
    }),
  );

  // UNCOMMENT THIS IF YOU WANT TO SEE REQUESTS
  // import { logger } from "hono/logger";
  // if (!isProduction) app.use("*", logger());

  // Configure static routes for production
  if (isProduction) {
    const publicDir = path.join(__dirname, "public");
    configureStaticRoutes(publicDir);
    app.route("", staticRoutes);
  }

  return { app, context };
}
