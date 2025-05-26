import { initTRPC, TRPCError } from '@trpc/server';
import { OpenApiMeta } from 'trpc-to-openapi';
import { JWTPayload } from 'jose';

export interface Context {
  authProviderId?: string;
  jwtPayload?: JWTPayload;
  sp: any; // (service provider) populated by gateway app
}

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create();

export const router = t.router;

/**
 * A public procedure (e.g., for unauthenticated users).
 */
export const publicProcedure = t.procedure;

/**
 * A protected procedure (e.g., for authenticated users).
 */
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.jwtPayload?.authProviderId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      authProviderId: ctx.jwtPayload.authProviderId,
    },
  });
});
