import {
  ActivityRepository,
  AuthRequestRepository,
  DB,
  FeedRepository,
  LeaderboardRepository,
  ModerationRepository,
  PluginRepository,
  ProcessingRepository,
  SubmissionRepository,
  TwitterRepository,
  UserRepository,
} from "@curatedotfun/shared-db";
import { Logger } from "pino";
import { env as pluginsEnv } from "./env";
import { MockTwitterService } from "./mocks/twitter-service.mock";
import { ActivityService } from "./services/activity.service";
import { AuthService } from "./services/auth.service";
import { ConfigService } from "./services/config.service";
import { DistributionService } from "./services/distribution.service";
import { FeedService } from "./services/feed.service";
import { IBackgroundTaskService } from "./services/interfaces/background-task.interface";
import { ModerationService } from "./services/moderation.service";
import { PluginService } from "./services/plugin.service";
import { ProcessingService } from "./services/processing.service";
import { SubmissionService } from "./services/submission.service";
import { TransformationService } from "./services/transformation.service";
import { TwitterService } from "./services/twitter/client";
import { ITwitterService } from "./services/twitter/twitter.interface";
import { UserService } from "./services/users.service";
import { getSuperAdminAccounts } from "./utils/auth";

interface ServiceProviderConfig {
  db: DB;
  logger: Logger;
  env: {
    NODE_ENV: string;
    SUPER_ADMIN_ACCOUNTS?: string;
    TWITTER_USERNAME?: string;
    TWITTER_PASSWORD?: string;
    TWITTER_EMAIL?: string;
    TWITTER_2FA_SECRET?: string;
    MASTER_KEYPAIR?: string;
  };
}

export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();
  private backgroundTaskServices: IBackgroundTaskService[] = [];
  private readonly superAdminAccountsList: string[];

  private constructor(private config: ServiceProviderConfig) {
    const { db, logger, env } = config;
    this.superAdminAccountsList = getSuperAdminAccounts(
      env.SUPER_ADMIN_ACCOUNTS,
    );

    const feedRepository = new FeedRepository(db);
    const twitterRespository = new TwitterRepository(db);
    const pluginRepository = new PluginRepository(db);

    const configService = new ConfigService();

    let twitterService: ITwitterService;
    if (env.NODE_ENV === "production") {
      twitterService = new TwitterService(
        {
          username: env.TWITTER_USERNAME!,
          password: env.TWITTER_PASSWORD!,
          email: env.TWITTER_EMAIL!,
          twoFactorSecret: env.TWITTER_2FA_SECRET,
        },
        twitterRespository,
      );
    } else {
      twitterService = new MockTwitterService();
    }

    const pluginService = new PluginService(
      pluginRepository,
      db,
      pluginsEnv,
      logger.child({ component: "PluginService" }),
    );
    const transformationService = new TransformationService(
      pluginService,
      logger.child({ component: "TransformationService" }),
    );
    const distributionService = new DistributionService(
      pluginService,
      configService,
      logger.child({ component: "DistributionService" }),
    );
    const processingRepository = new ProcessingRepository(db);

    const processingService = new ProcessingService(
      transformationService,
      distributionService,
      processingRepository,
      logger.child({ component: "ProcessingService" }),
    );

    const userRepository = new UserRepository(db);
    const userService = new UserService(
      userRepository,
      db,
      {
        parentAccountId: "users.curatefun.near",
        parentKeyPair: env.MASTER_KEYPAIR || "",
        networkId: "mainnet",
      },
      logger.child({ component: "UserService" }),
    );
    this.services.set("userService", userService);

    const authRequestRepository = new AuthRequestRepository(db);
    const authService = new AuthService(authRequestRepository, userService);
    this.services.set("authService", authService);

    const feedService = new FeedService(
      feedRepository,
      processingService,
      db,
      logger.child({ component: "FeedService" }),
      this.superAdminAccountsList,
    );

    this.services.set("configService", configService);
    this.services.set("pluginService", pluginService);
    this.services.set("transformationService", transformationService);
    this.services.set("distributionService", distributionService);
    this.services.set("processingService", processingService);
    this.services.set("feedService", feedService);
    this.services.set("twitterService", twitterService);
  }

  async init() {
    const { db, logger } = this.config;
    const twitterService = this.getService<TwitterService>("twitterService");
    const processingService =
      this.getService<ProcessingService>("processingService");
    const feedService = this.getService<FeedService>("feedService");

    await twitterService.initialize();

    const feedRepository = new FeedRepository(db);
    const submissionRepository = new SubmissionRepository(db);
    const moderationRepository = new ModerationRepository(db);

    const moderationService = new ModerationService(
      feedRepository,
      moderationRepository,
      submissionRepository,
      processingService,
      feedService,
      this.superAdminAccountsList,
      db,
      logger.child({ component: "ModerationService" }),
    );
    this.services.set("moderationService", moderationService);

    const submissionService = new SubmissionService(
      twitterService,
      feedRepository,
      submissionRepository,
      db,
      feedService,
      moderationService,
      logger.child({ component: "SubmissionService" }),
    );

    submissionService.initialize(); // TODO: remove
    this.services.set("submissionService", submissionService);
    this.backgroundTaskServices.push(submissionService);

    const activityRepository = new ActivityRepository(db);
    const leaderboardRepository = new LeaderboardRepository(db);
    const activityService = new ActivityService(
      activityRepository,
      leaderboardRepository,
      moderationService,
      this.getUserService(),
      db,
      logger.child({ component: "ActivityService" }),
    );
    this.services.set("activityService", activityService);
  }

  /**
   * Get a service instance
   * @param serviceName The name of the service to get
   * @returns The service instance
   * @throws Error if the service is not found
   */
  public getService<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }

  /**
   * Get the user service
   * @returns The user service
   */
  public getUserService(): UserService {
    return this.getService<UserService>("userService");
  }

  /**
   * Get the auth service
   * @returns The auth service
   */
  public getAuthService(): AuthService {
    return this.getService<AuthService>("authService");
  }

  /**
   * Get the activity service
   * @returns The activity service
   */
  public getActivityService(): ActivityService {
    return this.getService<ActivityService>("activityService");
  }

  public getConfigService(): ConfigService {
    return this.getService<ConfigService>("configService");
  }

  public getPluginService(): PluginService {
    return this.getService<PluginService>("pluginService");
  }

  public getTransformationService(): TransformationService {
    return this.getService<TransformationService>("transformationService");
  }

  public getDistributionService(): DistributionService {
    return this.getService<DistributionService>("distributionService");
  }

  public getProcessingService(): ProcessingService {
    return this.getService<ProcessingService>("processingService");
  }

  public getFeedService(): FeedService {
    return this.getService<FeedService>("feedService");
  }

  public getModerationService(): ModerationService {
    return this.getService<ModerationService>("moderationService");
  }

  public getSubmissionService(): SubmissionService {
    return this.getService<SubmissionService>("submissionService");
  }

  public getTwitterService(): ITwitterService {
    return this.getService<ITwitterService>("twitterService");
  }

  /**
   * Get all services that implement IBackgroundTaskService
   * @returns An array of background task services
   */
  public getBackgroundTaskServices(): IBackgroundTaskService[] {
    return this.backgroundTaskServices;
  }

  public getLogger(): Logger {
    return this.config.logger;
  }

  public static getInstance(config?: ServiceProviderConfig): ServiceProvider {
    if (!ServiceProvider.instance) {
      if (!config) {
        throw new Error(
          "ServiceProvider has not been initialized. Call getInstance with config first.",
        );
      }
      ServiceProvider.instance = new ServiceProvider(config);
    }
    return ServiceProvider.instance;
  }
}
