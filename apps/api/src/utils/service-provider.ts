import {
  ActivityRepository,
  AuthRequestRepository,
  FeedRepository,
  LeaderboardRepository,
  ModerationRepository,
  SubmissionRepository,
  TwitterRepository,
  UserRepository,
} from "@curatedotfun/shared-db";
import { SubmissionService } from "services/submission.service";
import { MockTwitterService } from "../__test__/mocks/twitter-service.mock";
import { db } from "../db";
import { ActivityService } from "../services/activity.service";
import { AuthService } from "../services/auth.service";
import { ConfigService, isProduction } from "../services/config.service";
import { DistributionService } from "../services/distribution.service";
import { FeedService } from "../services/feed.service";
import { IBackgroundTaskService } from "../services/interfaces/background-task.interface";
import { ModerationService } from "../services/moderation.service";
import { PluginService } from "../services/plugin.service";
import { ProcessorService } from "../services/processor.service";
import { TransformationService } from "../services/transformation.service";
import { TwitterService } from "../services/twitter/client";
import { UserService } from "../services/users.service";
import { getSuperAdminAccounts } from "./auth.utils";
import { logger } from "./logger";

export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();
  private backgroundTaskServices: IBackgroundTaskService[] = [];
  private readonly superAdminAccountsList: string[];

  private constructor() {
    this.superAdminAccountsList = getSuperAdminAccounts(
      process.env.SUPER_ADMIN_ACCOUNTS,
    );

    const feedRepository = new FeedRepository(db);
    const twitterRespository = new TwitterRepository(db);

    const configService = new ConfigService();

    let twitterService: TwitterService | null = null;
    if (isProduction) {
      twitterService = new TwitterService(
        {
          username: process.env.TWITTER_USERNAME!,
          password: process.env.TWITTER_PASSWORD!,
          email: process.env.TWITTER_EMAIL!,
          twoFactorSecret: process.env.TWITTER_2FA_SECRET,
        },
        twitterRespository,
      );
    } else {
      // Use mock service in test and development
      // You can trigger the mock via the frontend's Test Panel
      twitterService = new MockTwitterService();
    }

    const pluginService = new PluginService(logger);
    const transformationService = new TransformationService(
      pluginService,
      logger,
    );
    const distributionService = new DistributionService(
      pluginService,
      configService,
      logger,
    );
    const processorService = new ProcessorService(
      transformationService,
      distributionService,
      logger,
    );

    const userRepository = new UserRepository(db);
    const userService = new UserService(
      userRepository,
      db,
      {
        parentAccountId: "users.curatefun.near",
        parentKeyPair: process.env.MASTER_KEYPAIR || "",
        networkId: "mainnet",
      },
      logger,
    );
    this.services.set("userService", userService);

    const authRequestRepository = new AuthRequestRepository(db);
    const authService = new AuthService(authRequestRepository, userService);
    this.services.set("authService", authService);

    const feedService = new FeedService(
      feedRepository,
      processorService,
      db,
      logger,
      this.superAdminAccountsList,
    );

    this.services.set("configService", configService);
    this.services.set("pluginService", pluginService);
    this.services.set("transformationService", transformationService);
    this.services.set("distributionService", distributionService);
    this.services.set("processorService", processorService);
    this.services.set("feedService", feedService);

    this.services.set("twitterService", twitterService);

    // if (sourceService) {
    //   this.backgroundTaskServices.push(sourceService);
    // }
  }

  async init() {
    const twitterService = this.services.get("twitterService");
    const processorService = this.services.get("processorService");
    const feedService = this.services.get("feedService");

    await twitterService.initialize();

    const feedRepository = new FeedRepository(db);
    const submissionRepository = new SubmissionRepository(db);
    const moderationRepository = new ModerationRepository(db);

    const moderationService = new ModerationService(
      feedRepository,
      moderationRepository,
      submissionRepository,
      processorService,
      feedService,
      this.superAdminAccountsList,
      db,
      logger,
    );
    this.services.set("moderationService", moderationService);

    const submissionService = twitterService
      ? new SubmissionService(
          twitterService,
          feedRepository,
          submissionRepository,
          db,
          feedService,
          logger,
        )
      : null;

    if (submissionService) {
      submissionService.initialize(); // TODO: remove
      this.backgroundTaskServices.push(submissionService);
    }

    const activityRepository = new ActivityRepository(db);
    const leaderboardRepository = new LeaderboardRepository(db);
    const activityService = new ActivityService(
      activityRepository,
      leaderboardRepository,
      moderationService,
      this.getUserService(),
      db,
      logger,
    );
    this.services.set("activityService", activityService);
  }

  /**
   * Initialize the service provider
   * @returns The service provider instance
   */
  public static initialize(): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider();
    }
    return ServiceProvider.instance;
  }

  /**
   * Get the service provider instance
   * @returns The service provider instance
   * @throws Error if the service provider is not initialized
   */
  public static getInstance(): ServiceProvider {
    if (!ServiceProvider.instance) {
      throw new Error(
        "ServiceProvider not initialized. Call initialize() first.",
      );
    }
    return ServiceProvider.instance;
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

  public getProcessorService(): ProcessorService {
    return this.getService<ProcessorService>("processorService");
  }

  public getFeedService(): FeedService {
    return this.getService<FeedService>("feedService");
  }

  /**
   * Get all services that implement IBackgroundTaskService
   * @returns An array of background task services
   */
  public getBackgroundTaskServices(): IBackgroundTaskService[] {
    return this.backgroundTaskServices;
  }
}
