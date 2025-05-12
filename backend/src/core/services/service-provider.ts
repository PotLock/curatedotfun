import { Container, Lifetime } from '../container';
import { FeedRepository, SubmissionRepository, getFeedRepository, getSubmissionRepository } from '../repositories';
import { FeedService, getFeedService } from './feed.service';
import { SubmissionService, getSubmissionService } from './submission.service';
import { TwitterService } from '../../services/twitter/client';
import { ProcessorService } from '../../services/processor/processor.service';
import { RuleEngineService } from '../../services/rules/rule.engine.service';
import { TransformationService } from '../../services/transformation/transformation.service';
import { PluginService } from '../../services/plugins/plugin.service';
import { ConfigService } from '../../services/config/config.service';
import { AppConfig } from '../../types/config';

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

    container.register<SubmissionRepository>(
      'SubmissionRepository',
      () => getSubmissionRepository(db, tables),
      { lifetime: Lifetime.SINGLETON }
    );

    // Register services
    container.register<FeedService>(
      'FeedService',
      () => getFeedService(container.resolve<FeedRepository>('FeedRepository')),
      { lifetime: Lifetime.SINGLETON }
    );

    container.register<SubmissionService>(
      'SubmissionService',
      () => getSubmissionService(
        container.resolve<SubmissionRepository>('SubmissionRepository'),
        container.resolve<TwitterService>('TwitterService'),
        container.resolve<ProcessorService>('ProcessorService'),
        container.resolve<AppConfig>('AppConfig')
      ),
      { lifetime: Lifetime.SINGLETON }
    );

    // Register service interfaces
    container.register<FeedService>(
      'IFeedService',
      () => container.resolve<FeedService>('FeedService'),
      { lifetime: Lifetime.SINGLETON }
    );

    container.register<SubmissionService>(
      'ISubmissionService',
      () => container.resolve<SubmissionService>('SubmissionService'),
      { lifetime: Lifetime.SINGLETON }
    );

    // Register RuleEngineService
    container.register<RuleEngineService>(
      'RuleEngineService',
      () => new RuleEngineService(
        container.resolve<ConfigService>('ConfigService'),
        container.resolve<PluginService>('PluginService'),
        container.resolve<TransformationService>('TransformationService')
      ),
      { lifetime: Lifetime.SINGLETON }
    );
  }
}
