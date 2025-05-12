import { Context } from 'hono';
import { AppContext as LegacyAppContext } from '../types/app';
import { container } from './container';

/**
 * Enhanced application context that provides access to services
 * through the dependency injection container.
 */
export interface AppContext extends LegacyAppContext {
  /**
   * Get a service from the container
   * @param token The service token to resolve
   * @returns The resolved service
   */
  getService<T>(token: string | symbol | (new (...args: any[]) => T)): T;

  /**
   * Check if a service is registered with the container
   * @param token The service token to check
   * @returns True if the service is registered
   */
  hasService(token: string | symbol | (new (...args: any[]) => any)): boolean;
}

/**
 * Create an enhanced application context from a legacy context
 * @param legacyContext The legacy application context
 * @returns An enhanced application context
 */
export function createAppContext(legacyContext: LegacyAppContext): AppContext {
  // Register legacy services with the container
  // Use string tokens for services with private constructors
  if (!container.has('ConfigService')) {
    container.registerInstance('ConfigService', legacyContext.configService);
  }

  if (legacyContext.twitterService && !container.has('TwitterService')) {
    container.registerInstance('TwitterService', legacyContext.twitterService);
  }

  if (legacyContext.submissionService && !container.has('SubmissionService')) {
    container.registerInstance('SubmissionService', legacyContext.submissionService);
  }

  if (legacyContext.distributionService && !container.has('DistributionService')) {
    container.registerInstance('DistributionService', legacyContext.distributionService);
  }

  if (legacyContext.processorService && !container.has('ProcessorService')) {
    container.registerInstance('ProcessorService', legacyContext.processorService);
  }

  if (legacyContext.schedulerService && !container.has('SchedulerService')) {
    container.registerInstance('SchedulerService', legacyContext.schedulerService);
  }

  if (legacyContext.feedRepository && !container.has('FeedRepository')) {
    container.registerInstance('FeedRepository', legacyContext.feedRepository);
  }

  if (legacyContext.ruleEngineService && !container.has('RuleEngineService')) {
    container.registerInstance('RuleEngineService', legacyContext.ruleEngineService);
  }

  // Create enhanced context
  return {
    ...legacyContext,
    getService<T>(token: string | symbol | (new (...args: any[]) => T)): T {
      return container.resolve<T>(token);
    },
    hasService(token: string | symbol | (new (...args: any[]) => any)): boolean {
      return container.has(token);
    }
  };
}

/**
 * Get the application context from a Hono context
 * @param c The Hono context
 * @returns The application context
 */
export function getAppContext(c: Context): AppContext {
  const legacyContext = c.get('context') as LegacyAppContext;
  return createAppContext(legacyContext);
}

/**
 * Middleware to inject the enhanced application context into the Hono context
 */
export function appContextMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const legacyContext = c.get('context') as LegacyAppContext;
    const enhancedContext = createAppContext(legacyContext);
    c.set('context', enhancedContext);
    await next();
  };
}
