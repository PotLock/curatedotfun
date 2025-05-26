import type { AppRouter } from '@curatedotfun/api-contract';
import { router } from '@curatedotfun/api-contract';
import { activityRouter } from './activity';

export const appRouter: AppRouter = router({
  activity: activityRouter,
  // Future routers will be merged here:
  // health: healthRouter,
  // users: usersRouter,
  // feeds: feedsRouter,
  // ...etc
});
