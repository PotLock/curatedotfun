import { Hono } from "hono";
import { ConfigService } from "../services/config/config.service";
import { DistributionService } from "../services/distribution/distribution.service";
import { ProcessorService } from "../services/processor/processor.service";
import { SubmissionService } from "../services/submissions/submission.service";
import { TwitterService } from "../services/twitter/client";
import { FeedRepository } from "../services/db/repositories/feed.repository";
import { SchedulerService } from "../services/scheduler/scheduler.service";
import { RuleEngineService } from "../services/rules/rule.engine.service";
import { Container } from "../core/container";

/**
 * Application context shared across routes
 */
export interface AppContext {
  twitterService: TwitterService | null;
  submissionService: SubmissionService | null;
  distributionService: DistributionService | null;
  processorService: ProcessorService | null;
  configService: ConfigService;
  schedulerService: SchedulerService;
  feedRepository: FeedRepository;
  ruleEngineService: RuleEngineService;
  container: Container;
}

/**
 * Application instance returned by createApp
 */
export interface AppInstance {
  app: HonoAppType;
  context: AppContext;
}

/**
 * Type for Hono app with AppContext
 */
export type HonoAppType = Hono<{
  Variables: {
    context: AppContext;
  };
}>;

/**
 * Factory function to create a new Hono app with AppContext
 */
export const HonoApp = (): HonoAppType => {
  return new Hono<{
    Variables: {
      context: AppContext;
    };
  }>();
};
