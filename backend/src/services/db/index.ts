import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ActivityRepository } from "./repositories/activity.repository";
import { FeedRepository } from "./repositories/feed.repository";
import { LastProcessedStateRepository } from "./repositories/lastProcessedState.repository";
import { LeaderboardRepository } from "./repositories/leaderboard.repository";
import { SubmissionRepository } from "./repositories/submission.repository";
import { UserRepository } from "./repositories/user.repository";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
});
const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export { db, pool };

export const activityRepository = new ActivityRepository(db);
export const feedRepository = new FeedRepository(db);
export const lastProcessedStateRepository = new LastProcessedStateRepository(
  db,
);
export const leaderboardRepository = new LeaderboardRepository(db);
export const submissionRepository = new SubmissionRepository(db);
export const userRepository = new UserRepository(db);
