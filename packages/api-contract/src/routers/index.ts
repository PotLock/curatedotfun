import { router } from '../trpc';
import { activityContractRouter } from './activity';

export const appContractRouter = router({
  activity: activityContractRouter,
});

export type AppRouter = typeof appContractRouter;
