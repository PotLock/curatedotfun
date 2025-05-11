import { Container, Lifetime } from '../container';
import { FeedRepository, getFeedRepository } from '../repositories';
import { FeedService, getFeedService } from './feed.service';

/**
 * Service provider for registering services with the container
 */
export class ServiceProvider {
  /**
   * Register all services with the container
   * @param container The dependency injection container
   * @param db Database connection
   * @param tables Database tables
   */
  static registerServices(container: Container, db: any, tables: any): void {
    // Register repositories
    container.register<FeedRepository>(
      'FeedRepository',
      () => getFeedRepository(db, tables.feeds),
      { lifetime: Lifetime.SINGLETON }
    );

    // Register services
    container.register<FeedService>(
      'FeedService',
      () => getFeedService(container.resolve<FeedRepository>('FeedRepository')),
      { lifetime: Lifetime.SINGLETON }
    );

    // Register service interfaces
    container.register<FeedService>(
      'IFeedService',
      () => container.resolve<FeedService>('FeedService'),
      { lifetime: Lifetime.SINGLETON }
    );
  }
}
