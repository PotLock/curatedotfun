import { ActivityService } from "../services/activity.service";
import { AdapterService } from "../services/adapter.service";
import { ConfigService } from "../services/config.service";
import { DatabaseConnection } from "../services/db/connection";
import { UserRepository } from "../services/db/repositories";
import { ActivityRepository } from "../services/db/repositories/activity.repository";
import { lastProcessedStateRepository } from "../services/db/repositories/lastProcessedState.repository";
import { DistributionService } from "../services/distribution.service";
import { InboundService } from "../services/inbound.service";
import { PluginService } from "../services/plugin.service";
import { ProcessorService } from "../services/processor.service";
import { SourceService } from "../services/source.service";
import { SubmissionService } from "../services/submission.service";
import { TransformationService } from "../services/transformation.service";
import { UserService } from "../services/users.service";

/**
 * Service provider for dependency injection
 * This class is responsible for creating and providing service instances
 */
export class ServiceProvider {
  private static instance: ServiceProvider;
  private services: Map<string, any> = new Map();

  private constructor(private dbConnection: DatabaseConnection) {
    // Get repository instances
    const activityRepository = new ActivityRepository();
    const userRepository = new UserRepository();

    // Core services
    const configService = ConfigService.getInstance();
    const appConfig = configService.getConfig();
    const pluginService = PluginService.getInstance();

    // Transformation and Distribution
    const transformationService = new TransformationService(pluginService);
    const distributionService = new DistributionService(pluginService);

    // Processor Service
    const processorService = new ProcessorService(
      transformationService,
      distributionService,
    );

    // Submission Service (refactored)
    const submissionService = new SubmissionService(
      processorService,
      appConfig,
    );

    // Source Ingestion Services
    const sourceService = new SourceService(
      pluginService,
      lastProcessedStateRepository,
    );
    const adapterService = new AdapterService(appConfig);
    const inboundService = new InboundService(
      adapterService,
      submissionService,
      appConfig,
    );

    // Initialize services with their dependencies
    this.services.set("userService", new UserService(userRepository));
    this.services.set(
      "activityService",
      new ActivityService(activityRepository),
    );
    // TODO: Move services to injection, no singleton
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
   * @param dbConnection Database connection
   * @returns The service provider instance
   */
  public static initialize(dbConnection: DatabaseConnection): ServiceProvider {
    if (!ServiceProvider.instance) {
      ServiceProvider.instance = new ServiceProvider(dbConnection);
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
}
