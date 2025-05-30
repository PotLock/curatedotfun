import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { apiRoutes } from "./routes/api";
import { mockTwitterService } from "./routes/api/test";
import { ConfigService, isProduction } from "./services/config.service";
import { getDatabase } from "./services/db";
import { feedRepository } from "./services/db/repositories";
import { DistributionService } from "./services/distribution.service";
import { PluginService } from "./services/plugin.service";
import { ProcessorService } from "./services/processor.service";
import { SubmissionService } from "./services/submission.service";
import { TransformationService } from "./services/transformation.service";
import { TwitterService } from "./services/twitter/client";
import { AppContext, AppInstance, Env } from "./types/app";
import { web3AuthJwtMiddleware } from "./utils/auth";
import { getAllowedOrigins } from "./utils/config";
import { errorHandler } from "./utils/error";
import { ServiceProvider } from "./utils/service-provider";

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
  // const schedulerClient = new SchedulerClient({
  //   baseUrl: process.env.SCHEDULER_BASE_URL || "http://localhost:3001",
  //   headers: {
  //     Authorization: `Bearer ${process.env.SCHEDULER_API_TOKEN || ""}`,
  //   },
  // });

  // const backendUrl = process.env.CURATE_BACKEND_URL || "http://localhost:3000";
  // const schedulerService = new SchedulerService(
  //   feedRepository,
  //   processorService,
  //   schedulerClient,
  //   backendUrl,
  // );

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
    // schedulerService,
    feedRepository,
  };

  // Create Hono app
  const app = new Hono<Env>();

  // Inject database into context
  app.use("*", async (c, next) => {
    const dbInstance = getDatabase();
    c.set("db", dbInstance);

    ServiceProvider.initialize(dbInstance);

    await next();
  });

  // Set context (make services accessible to routes)
  app.use("*", async (c, next) => {
    c.set("context", context);
    await next();
  });

  // Handle errors
  app.onError((err, c) => {
    return errorHandler(err, c);
  });

  app.use("*", web3AuthJwtMiddleware);

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

  // Mount API routes
  app.route("/api", apiRoutes);

  return { app, context };
}
