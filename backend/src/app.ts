import { SchedulerClient } from "@crosspost/scheduler-sdk";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import path from "path";
import { apiRoutes } from "./routes/api";
import { configureStaticRoutes, staticRoutes } from "./routes/static";
import { ConfigService, isProduction } from "./services/config.service";
import { getDatabase } from "./services/db";
import { feedRepository } from "./services/db/repositories";
import { SchedulerService } from "./services/scheduler.service";
import { AppInstance, Env } from "./types/app";
import { web3AuthJwtMiddleware } from "./utils/auth";
import { getAllowedOrigins } from "./utils/config";
import { errorHandler } from "./utils/error";
import { ServiceProvider } from "./utils/service-provider";

const ALLOWED_ORIGINS = getAllowedOrigins();

export async function createApp(): Promise<AppInstance> {
  const initialConfigService = ConfigService.getInstance();
  await initialConfigService.loadConfig();


  // Create Hono app
  const app = new Hono<Env>();

  // Inject database into context
  app.use("*", async (c, next) => {
    const dbInstance = getDatabase();
    c.set("db", dbInstance);

    ServiceProvider.initialize(dbInstance);
    const sp = ServiceProvider.getInstance();

    // Instantiate SchedulerService
    const schedulerClient = new SchedulerClient({
      baseUrl: process.env.SCHEDULER_BASE_URL || "http://localhost:3001",
      headers: {
        Authorization: `Bearer ${process.env.SCHEDULER_API_TOKEN || ""}`,
      },
    });
    const backendUrl = process.env.CURATE_BACKEND_URL || "http://localhost:3000";
    const schedulerService = new SchedulerService(
      feedRepository,
      sp.getProcessorService(),
      sp.getSourceService(),
      sp.getInboundService(),
      schedulerClient,
      backendUrl,
    );

    // Initialize scheduler on startup (non-blocking)
    schedulerService.initialize().catch((err) => {
      console.error("Failed to initialize scheduler service:", err);
    });

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

  // Configure static routes for production
  if (isProduction) {
    const publicDir = path.join(__dirname, "public");
    configureStaticRoutes(publicDir);
    app.route("", staticRoutes);
  }

  return { app };
}
