import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { helmet } from "elysia-helmet";
import path from "path";
import { mockTwitterService, testRoutes } from "./routes/test";
import { ConfigService, isProduction } from "./services/config/config.service";
import { db } from "./services/db";
import { DistributionService } from "./services/distribution/distribution.service";
import { SubmissionService } from "./services/submissions/submission.service";
import { TwitterService } from "./services/twitter/client";
import { logger } from "./utils/logger";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173", // Dev server
  "https://curatedotfun-floral-sun-1539.fly.dev",
];

export interface AppContext {
  twitterService: TwitterService | null;
  submissionService: SubmissionService | null;
  distributionService: DistributionService | null;
  configService: ConfigService;
}

export interface AppInstance {
  app: Elysia;
  context: AppContext;
}

export async function createApp(): Promise<AppInstance> {
  // Initialize services
  const configService = ConfigService.getInstance();
  await configService.loadConfig();

  const distributionService = new DistributionService();

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
        distributionService,
        configService.getConfig(),
      )
    : null;

  if (submissionService) {
    await submissionService.initialize();
  }

  const context: AppContext = {
    twitterService,
    submissionService,
    distributionService,
    configService,
  };

  // Create Elysia app with middleware and store
  const app = new Elysia()
    .decorate("context", context)
    .use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        xFrameOptions: { action: "sameorigin" },
      }),
    )
    .use(
      cors({
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
      }),
    )
    .use(swagger())
    .use(isProduction ? new Elysia() : testRoutes)
    // API Routes
    .get(
      "/api/twitter/last-tweet-id",
      ({ context }: { context: AppContext }) => {
        if (!context.twitterService) {
          throw new Error("Twitter service not available");
        }
        const lastTweetId = context.twitterService.getLastCheckedTweetId();
        return { lastTweetId };
      },
    )
    .post(
      "/api/twitter/last-tweet-id",
      async ({
        body,
        context,
      }: {
        body: { tweetId: string };
        context: AppContext;
      }) => {
        if (!context.twitterService) {
          throw new Error("Twitter service not available");
        }
        if (
          !body?.tweetId ||
          typeof body.tweetId !== "string" ||
          !body.tweetId.match(/^\d+$/)
        ) {
          throw new Error("Invalid tweetId format");
        }
        await context.twitterService.setLastCheckedTweetId(body.tweetId);
        return { success: true };
      },
      {
        body: t.Object({
          tweetId: t.String(),
        }),
      },
    )
    .get(
      "/api/submission/:submissionId",
      async ({
        params: { submissionId },
      }: {
        params: { submissionId: string };
      }) => {
        const content = await db.getSubmission(submissionId);
        if (!content) {
          throw new Error(`Content not found: ${submissionId}`);
        }
        return content;
      },
      {
        params: t.Object({
          submissionId: t.String(),
        }),
      },
    )
    .get(
      "/api/submissions",
      async ({ query }: { query: { limit?: string; offset?: string } }) => {
        const limit = query.limit ? parseInt(query.limit) : undefined;
        const offset = query.offset ? parseInt(query.offset) : undefined;
        return await db.getAllSubmissions(limit, offset);
      },
      {
        query: t.Object({
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/api/submissions/:feedId",
      async ({
        params: { feedId },
        query: { status },
        context,
      }: {
        params: { feedId: string };
        query: { status?: string };
        context: AppContext;
      }) => {
        const feed = context.configService.getFeedConfig(feedId);
        if (!feed) {
          throw new Error(`Feed not found: ${feedId}`);
        }
        let submissions = await db.getSubmissionsByFeed(feedId);
        if (status) {
          submissions = submissions.filter((sub) => sub.status === status);
        }
        return submissions;
      },
      {
        params: t.Object({
          feedId: t.String(),
        }),
        query: t.Object({
          status: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/api/feed/:feedId",
      ({
        params: { feedId },
        context,
      }: {
        params: { feedId: string };
        context: AppContext;
      }) => {
        const feed = context.configService.getFeedConfig(feedId);
        if (!feed) {
          throw new Error(`Feed not found: ${feedId}`);
        }

        return db.getSubmissionsByFeed(feedId);
      },
      {
        params: t.Object({
          feedId: t.String(),
        }),
      },
    )
    .get("/api/config", async ({ context }: { context: AppContext }) => {
      const rawConfig = await context.configService.getRawConfig();
      return rawConfig;
    })
    .get("/api/feeds", async ({ context }: { context: AppContext }) => {
      const rawConfig = await context.configService.getRawConfig();
      return rawConfig.feeds;
    })
    .get(
      "/api/config/:feedId",
      ({
        params: { feedId },
        context,
      }: {
        params: { feedId: string };
        context: AppContext;
      }) => {
        const feed = context.configService.getFeedConfig(feedId);
        if (!feed) {
          throw new Error(`Feed not found: ${feedId}`);
        }
        return feed;
      },
      {
        params: t.Object({
          feedId: t.String(),
        }),
      },
    )
    .post(
      "/api/feeds/:feedId/process",
      async ({
        params: { feedId },
        context,
      }: {
        params: { feedId: string };
        context: AppContext;
      }) => {
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
          return { processed: 0 };
        }

        // Process each submission through stream output
        let processed = 0;
        if (!context.distributionService) {
          throw new Error("Distribution service not available");
        }
        for (const submission of approvedSubmissions) {
          try {
            await context.distributionService.processStreamOutput(
              feedId,
              submission,
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
      },
      {
        params: t.Object({
          feedId: t.String(),
        }),
      },
    )
    // Serve frontend in production, proxy to dev server in development
    .use(
      isProduction
        ? staticPlugin({
            assets: path.join(__dirname, "public"),
            prefix: "/",
            alwaysStatic: true,
          })
        : new Elysia(),
    )
    .get("/*", () => {
      return Bun.file(path.join(__dirname, "public/index.html"));
    });

  return { app, context };
}
