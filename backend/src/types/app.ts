import { JwtVariables } from "hono/jwt";
import { ConfigService } from "../services/config/config.service";
import { FeedRepository } from "../services/db/repositories/feed.repository";
import { DistributionService } from "../services/distribution/distribution.service";
import { ProcessorService } from "../services/processor/processor.service";
import { SubmissionService } from "../services/submissions/submission.service";
import { TwitterService } from "../services/twitter/client";
import { Hono } from "hono";

export interface AppContext {
  twitterService: TwitterService | null;
  submissionService: SubmissionService | null;
  distributionService: DistributionService | null;
  processorService: ProcessorService | null;
  configService: ConfigService;
  // schedulerService: SchedulerService;
  feedRepository: FeedRepository;
}

export type Env = {
  Variables: {
    context: AppContext;
    db: ReturnType<typeof import("../services/db").getDatabase>; // TODO: better return type?
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
  context: AppContext;
}
