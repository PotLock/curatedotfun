import { ActivityService } from "../services/activity.service";
import { AdapterService } from "../services/adapter.service";
import { ConfigService } from "../services/config.service";
import {
  ActivityRepository,
  FeedRepository,
  LastProcessedStateRepository,
  LeaderboardRepository,
  SubmissionRepository,
  UserRepository,
} from "@curatedotfun/shared-db";
import { db } from "db";
import { DistributionService } from "../services/distribution.service";
import { FeedService } from "../services/feed.service";
import { InboundService } from "../services/inbound.service";
import { IBackgroundTaskService } from "../services/interfaces/background-task.interface";
import { InterpretationService } from "../services/interpretation.service";
import { PluginService } from "../services/plugin.service";
import { ProcessorService } from "../services/processor.service";
import { SourceService } from "../services/source.service";
import { SubmissionService } from "../services/submission.service";
import { TransformationService } from "../services/transformation.service";
import { UserService } from "../services/users.service";
import { logger } from "./logger";
import { AppConfig } from "@curatedotfun/types";

export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();
  private backgroundTaskServices: IBackgroundTaskService[] = [];

  private constructor(private appConfig: AppConfig) {
    const activityRepository = new ActivityRepository(db);
    const feedRepository = new FeedRepository(db);
    const lastProcessedStateRepository = new LastProcessedStateRepository(db);
    const leaderboardRepository = new LeaderboardRepository(db);
    const submissionRepository = new SubmissionRepository(db);
    const userRepository = new UserRepository(db);

    const configService = new ConfigService();
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
    const submissionService = new SubmissionService(
      submissionRepository,
      feedRepository,
      processorService,
      db,
      logger,
    );
    const adapterService = new AdapterService(logger);
    const interpretationService = new InterpretationService(logger);
    const inboundService = new InboundService(
      adapterService,
      interpretationService,
      submissionService,
      logger,
    );
    const sourceService = new SourceService(
      pluginService,
      lastProcessedStateRepository,
      inboundService,
      db,
      feedRepository,
      logger,
    );
    const feedService = new FeedService(
      feedRepository,
      processorService,
      db,
      logger,
    );

    const nearIntegrationConfig = this.appConfig.integrations?.near; // get from env
    if (!nearIntegrationConfig) {
      logger.error(
        "CRITICAL: NEAR integration configuration (appConfig.integrations.near) is missing. UserService requires this configuration to function.",
      );
      throw new Error(
        "NEAR integration configuration (appConfig.integrations.near) is missing.",
      );
    }
    this.services.set(
      "userService",
      new UserService(userRepository, db, nearIntegrationConfig, logger),
    );
    this.services.set(
      "activityService",
      new ActivityService(
        activityRepository,
        leaderboardRepository,
        db,
        logger,
      ),
    );

    this.services.set("feedService", feedService);
    this.services.set("configService", configService);
    this.services.set("pluginService", pluginService);
    this.services.set("transformationService", transformationService);
    this.services.set("distributionService", distributionService);
    this.services.set("processorService", processorService);
    this.services.set("submissionService", submissionService);
    this.services.set("sourceService", sourceService);
    this.services.set("adapterService", adapterService);
    this.services.set("interpretationService", interpretationService);
    this.services.set("inboundService", inboundService);

    // SourceService is the only background task service
    if (sourceService) {
      this.backgroundTaskServices.push(sourceService);
    }
  }

  /**
   * Initialize the service provider
   * @param appConfig The application configuration
   * @returns The service provider instance
   */
  public static initialize(appConfig: AppConfig): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider(appConfig);
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

  public getSubmissionService(): SubmissionService {
    return this.getService<SubmissionService>("submissionService");
  }

  public getSourceService(): SourceService {
    return this.getService<SourceService>("sourceService");
  }

  public getAdapterService(): AdapterService {
    return this.getService<AdapterService>("adapterService");
  }

  public getInboundService(): InboundService {
    return this.getService<InboundService>("inboundService");
  }

  public getInterpretationService(): InterpretationService {
    return this.getService<InterpretationService>("interpretationService");
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
