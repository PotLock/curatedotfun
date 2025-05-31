import { FeedRepository } from "@curatedotfun/shared-db";
import { db } from "../db";
import { ConfigService } from "../services/config.service";
import { DistributionService } from "../services/distribution.service";
import { FeedService } from "../services/feed.service";
import { IBackgroundTaskService } from "../services/interfaces/background-task.interface";
import { PluginService } from "../services/plugin.service";
import { ProcessorService } from "../services/processor.service";
import { TransformationService } from "../services/transformation.service";
import { logger } from "../utils/logger";
import { UserService } from "services/users.service";
import { ActivityService } from "services/activity.service";

export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();
  private backgroundTaskServices: IBackgroundTaskService[] = [];

  private constructor() {
    const feedRepository = new FeedRepository(db);

    const configService = new ConfigService();

    // let twitterService: TwitterService | null = null;
    // if (isProduction) {
    //   twitterService = new TwitterService({
    //     username: process.env.TWITTER_USERNAME!,
    //     password: process.env.TWITTER_PASSWORD!,
    //     email: process.env.TWITTER_EMAIL!,
    //     twoFactorSecret: process.env.TWITTER_2FA_SECRET,
    //   });
    //   await twitterService.initialize();
    // } else {
    //   // Use mock service in test and development
    //   // You can trigger the mock via the frontend's Test Panel
    //   twitterService = mockTwitterService;
    //   await twitterService.initialize();
    // }

    // const submissionService = twitterService
    //   ? new SubmissionService(
    //       twitterService,
    //       processorService,
    //       configService.getConfig(),
    //     )
    //   : null;

    // if (submissionService) {
    //   submissionService.initialize();
    // }

    const pluginService = new PluginService(configService, logger);
    const transformationService = new TransformationService(
      pluginService,
      logger,
    );
    const distributionService = new DistributionService(pluginService, logger);
    const processorService = new ProcessorService(
      transformationService,
      distributionService,
      logger,
    );

    const feedService = new FeedService(
      feedRepository,
      processorService,
      db,
      logger,
    );

    this.services.set("configService", configService);
    this.services.set("pluginService", pluginService);
    this.services.set("transformationService", transformationService);
    this.services.set("distributionService", distributionService);
    this.services.set("processorService", processorService);
    this.services.set("feedService", feedService);

    // if (sourceService) {
    //   this.backgroundTaskServices.push(sourceService);
    // }
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
