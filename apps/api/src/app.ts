import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { db } from "./db";
import { apiRoutes } from "./routes/api";
import { AppInstance, Env } from "./types/app";
import { web3AuthJwtMiddleware } from "./utils/auth";
import { getAllowedOrigins } from "./utils/config";
import { errorHandler } from "./utils/error";
import { ServiceProvider } from "./utils/service-provider";
import { logger } from "utils/logger";

const ALLOWED_ORIGINS = getAllowedOrigins();

export async function createApp(): Promise<AppInstance> {
  ServiceProvider.initialize();
  const sp = ServiceProvider.getInstance();

  const app = new Hono<Env>();

  app.onError((err, c) => {
    return errorHandler(err, c, logger);
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

  return { app };
}
