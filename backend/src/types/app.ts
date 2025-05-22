import { JwtVariables } from "hono/jwt";
import { ConfigService } from "../services/config.service";
import { FeedRepository } from "../services/db/repositories/feed.repository";
import { DistributionService } from "../services/distribution.service";
import { ProcessorService } from "../services/processor.service";
import { SubmissionService } from "../services/submission.service";
import { TwitterService } from "../services/twitter/client";
import { Hono } from "hono";

export type Env = {
  Variables: {
    db: ReturnType<typeof import("../services/db").getDatabase>; // TODO: better return type?
  } & JwtVariables;
};

export interface AppInstance {
  app: Hono<Env>;
}
