import { AppConfig } from "types/config.zod";
import { ActivityService } from "../services/activity.service";
import { AdapterService } from "../services/adapter.service";
import { ConfigService } from "../services/config.service";
import {
  activityRepository,
  db,
  feedRepository,
  lastProcessedStateRepository,
  submissionRepository,
  userRepository,
  leaderboardRepository,
} from "../services/db";
import { DistributionService } from "../services/distribution.service";
import { InboundService } from "../services/inbound.service";
import { PluginService } from "../services/plugin.service";
import { ProcessorService } from "../services/processor.service";
import { SourceService } from "../services/source.service";
import { SubmissionService } from "../services/submission.service";
import { TransformationService } from "../services/transformation.service";
import { UserService } from "../services/users.service";
import { FeedService } from "../services/feed.service";
import { IBackgroundTaskService } from "../services/interfaces/background-task.interface";
import { logger } from "./logger";

/**
 * Service provider for dependency injection
 * This class is responsible for creating and providing service instances
 */
export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();

  private constructor(private appConfig: AppConfig) {
    // Core services
    const configService = new ConfigService();
    const pluginService = new PluginService(configService);

    // Transformation and Distribution
    const transformationService = new TransformationService(pluginService);
    const distributionService = new DistributionService(pluginService);

    // Processor Service
    const processorService = new ProcessorService(
      transformationService,
      distributionService,
    );

    // Submission Service (refactored)
    // Uses appConfig from constructor
    const submissionService = new SubmissionService(
      submissionRepository,
      feedRepository,
      processorService,
      db,
      this.appConfig,
      logger,
    );

    const adapterService = new AdapterService(this.appConfig);
    const inboundService = new InboundService(
      adapterService,
      submissionService,
      this.appConfig,
    );

    const sourceService = new SourceService(
      pluginService,
      lastProcessedStateRepository,
      inboundService,
      db,
      this.appConfig,
    );

    // Initialize services with their dependencies
    // UserService now takes the imported db instance directly
    const nearIntegrationConfig = this.appConfig.integrations?.near;
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
      new UserService(userRepository, db, logger, nearIntegrationConfig),
    );
    this.services.set(
      "activityService",
      new ActivityService(activityRepository, leaderboardRepository, db),
    );
    // TODO: Move services to injection, no singleton
    // TODO: Inject repositories into other services as needed (e.g., submissionService might need SubmissionRepository)
    const feedService = new FeedService(
      feedRepository,
      processorService,
      this.appConfig,
      db,
      logger,
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
    this.services.set("inboundService", inboundService);
  }

  /**
   * Initialize the service provider
   * @param appConfig The application configuration
   * @returns The service provider instance
   */
  // Initialize now accepts AppConfig
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

  // Add getters for new services

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

  public getFeedService(): FeedService {
    return this.getService<FeedService>("feedService");
  }

  /**
   * Get all services that implement IBackgroundTaskService
   * @returns An array of background task services
   */
  public getBackgroundTaskServices(): IBackgroundTaskService[] {
    const backgroundServices: IBackgroundTaskService[] = [];
    for (const service of this.services.values()) {
      if (
        service &&
        typeof service.start === "function" &&
        typeof service.stop === "function"
      ) {
        // Further check if it's likely an IBackgroundTaskService.
        // This is a duck-typing approach. A more robust way would be for services
        // to register themselves as background tasks or use instanceof with a base class.
        // For now, this check should suffice for services like SourceService.
        if (service instanceof SourceService) {
          // Add other known background services here if any
          backgroundServices.push(service as IBackgroundTaskService);
        }
        // Add more specific checks if other services implement IBackgroundTaskService
        // else if (service instanceof SomeOtherBackgroundTaskService) {
        //   backgroundServices.push(service as IBackgroundTaskService);
        // }
      }
    }
    return backgroundServices;
  }
}
