import {
  ActivityQueryOptionsSchema,
  GlobalStatsSchema,
  LeaderboardQueryOptionsSchema,
  selectActivitySchema,
  UserRankingLeaderboardEntrySchema,
} from '@curatedotfun/types';
import { initTRPC } from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';
import { z } from 'zod';
import { ServiceProvider } from '../utils/service-provider';

export interface Context {
  sp: ServiceProvider;
}

// Initialize tRPC
const t = initTRPC.context<Context>().meta<OpenApiMeta>().create();

// Create a router and a procedure helper
export const router = t.router;
export const publicProcedure = t.procedure;

// Example: Router for activity-related procedures
// We'll need to instantiate ActivityService. This typically happens
// where the main app is set up, and the service instance is passed via context.
// For now, let's assume it's available in the context.

const activityRouter = router({
  getGlobalStats: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/global-stats', tags: ['activity'] } })
    .output(GlobalStatsSchema)
    .query(async ({ ctx }) => {
      const activityService = ctx.sp.getActivityService();
      return activityService.getGlobalStats();
    }),

  getUserRankingLeaderboard: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/leaderboard/user-ranking', tags: ['activity'] } })
    .input(LeaderboardQueryOptionsSchema.optional())
    .output(z.array(UserRankingLeaderboardEntrySchema))
    .query(async ({ ctx, input }) => {
      const activityService = ctx.sp.getActivityService();
      return activityService.getUserRankingLeaderboard(input);
    }),

  getUserActivities: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/users/{userId}/activities', tags: ['activity'] } })
    .input(z.object({
      userId: z.number().int(),
      options: ActivityQueryOptionsSchema.optional(),
    }))
    .output(z.array(selectActivitySchema)) // Use imported selectActivitySchema
    .query(async ({ ctx, input }) => {
      const activityService = ctx.sp.getActivityService();
      return activityService.getUserActivities(input.userId, input.options);
    }),

  // Add other activity service methods as procedures here
  // e.g., getUserStats, getFeedUserStats etc.
});

// Root router definition
export const appRouter = router({
  activity: activityRouter,
  // other routers can be merged here
});

export type AppRouter = typeof appRouter;
