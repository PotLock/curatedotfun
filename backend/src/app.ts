import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import path from "path";
import { db } from "./db";
import { apiRoutes } from "./routes/api";
import { configureStaticRoutes, staticRoutes } from "./routes/static";
import { appRouter } from "./routes/trpc";
import { ConfigService, isProduction } from "./services/config.service";
import { AppInstance, Env } from "./types/app";
import { web3AuthJwtMiddleware } from "./utils/auth";
import { getAllowedOrigins } from "./utils/config";
import { errorHandler } from "./utils/error";
import { ServiceProvider } from "./utils/service-provider";

const ALLOWED_ORIGINS = getAllowedOrigins();

export async function createApp(): Promise<AppInstance> {
  const tempConfigService = new ConfigService();
  const appConfig = await tempConfigService.loadConfig();

  ServiceProvider.initialize(appConfig);
  const sp = ServiceProvider.getInstance();

  const app = new Hono<Env>();

  app.onError((err, c) => {
    return errorHandler(err, c);
  });

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

  app.use("*", secureHeaders());

  app.use("*", async (c, next) => {
    c.set("db", db);
    c.set("sp", sp);
    await next();
  });

  // Authentication middleware
  app.use("*", web3AuthJwtMiddleware);

  // Mount API routes
  app.route("/api", apiRoutes);

  // tRPC server
  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: (_opts, c) => {
        const sp = c.var.sp;
        if (!sp) {
          throw new Error("ServiceProvider not found in Hono context");
        }
        return { sp };
      },
    }),
  );

  // Configure static routes for production
  if (isProduction) {
    const publicDir = path.join(__dirname, "public");
    configureStaticRoutes(publicDir);
    app.route("", staticRoutes);
  }

  return { app };
}
