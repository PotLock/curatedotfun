import { ServiceProvider } from "@curatedotfun/core-services";
import { createLogger } from "@curatedotfun/utils";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { db } from "./db";
import { createAuthMiddleware } from "./middlewares/auth.middleware";
import { apiRoutes } from "./routes/api";
import { AppInstance, Env } from "./types/app";
import { getAllowedOrigins } from "./utils/config";
import { errorHandler } from "./utils/error";

const ALLOWED_ORIGINS = getAllowedOrigins();

export async function createApp(): Promise<AppInstance> {
  const logger = createLogger({ service: "api" });
  const sp = ServiceProvider.getInstance({
    db,
    logger,
    env: {
      NODE_ENV: process.env.NODE_ENV || "development",
      SUPER_ADMIN_ACCOUNTS: process.env.SUPER_ADMIN_ACCOUNTS,
      TWITTER_USERNAME: process.env.TWITTER_USERNAME,
      TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
      TWITTER_EMAIL: process.env.TWITTER_EMAIL,
      TWITTER_2FA_SECRET: process.env.TWITTER_2FA_SECRET,
      MASTER_KEYPAIR: process.env.MASTER_KEYPAIR,
    },
  });
  await sp.init();

  const app = new Hono<Env>();

  app.onError((err, c) => {
    return errorHandler(err, c, logger);
  });

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (ALLOWED_ORIGINS.includes(origin)) {
          return origin;
        }
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

  // Apply auth middleware to all /api routes
  app.use("/api/*", createAuthMiddleware());

  // Mount API routes
  app.route("/api", apiRoutes);

  return { app };
}
