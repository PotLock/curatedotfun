import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import path from "path";
import { apiRoutes } from "./routes/api";
import { configureStaticRoutes, staticRoutes } from "./routes/static";
import { mockTwitterService } from "./routes/api/test";
import { ConfigService, isProduction } from "./services/config/config.service";
import { DistributionService } from "./services/distribution/distribution.service";
import { PluginService } from "./services/plugins/plugin.service";
import { ProcessorService } from "./services/processor/processor.service";
import { SubmissionService } from "./services/submissions/submission.service";
import { TransformationService } from "./services/transformation/transformation.service";
import { TwitterService } from "./services/twitter/client";
import { AppContext, AppInstance, HonoApp } from "./types/app";
import { errorHandler } from "./utils/error";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173", // Dev server
  "https://curatedotfun-floral-sun-1539.fly.dev",
];

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
      origin: ALLOWED_ORIGINS,
      allowMethods: ["GET", "POST"],
    }),
  );
  app.use("*", logger());

  // Mount API routes
  app.route("/api", apiRoutes);

  // Configure static routes for production
  if (isProduction) {
    const publicDir = path.join(__dirname, "public");
    configureStaticRoutes(publicDir);
    app.route("", staticRoutes);
  }

  return { app, context };
}
