import { ActivityService } from "../services/activity.service";
import { DatabaseConnection } from "../services/db/connection";
import { UserRepository } from "../services/db/repositories";
import { ActivityRepository } from "../services/db/repositories/activity.repository";
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

    // Initialize services with their dependencies
    this.services.set("userService", new UserService(userRepository));
    this.services.set(
      "activityService",
      new ActivityService(activityRepository),
    );
    // Add more services as needed
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
}
