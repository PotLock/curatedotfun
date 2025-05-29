import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { OpenApiMeta } from "trpc-to-openapi";
import { z } from "zod";
import { ServiceProvider } from "./utils/service-provider";
import { JWTPayload } from "jose";
import { ActivityServiceError } from "@curatedotfun/utils";

export interface Context {
  sp: ServiceProvider;
  jwtPayload?: JWTPayload;
  authProviderId?: string;
}

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.jwtPayload?.authProviderId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not authenticated",
    });
  }
  return next({
    ctx: {
      ...ctx,
      authProviderId: ctx.jwtPayload.authProviderId,
    },
  });
});

// Error handling utility
export function handleServiceError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof ActivityServiceError) {
    let code: TRPC_ERROR_CODE_KEY = "INTERNAL_SERVER_ERROR";
    // Basic status code mapping
    if (error.statusCode === 400) code = "BAD_REQUEST";
    else if (error.statusCode === 401) code = "UNAUTHORIZED";
    else if (error.statusCode === 403) code = "FORBIDDEN";
    else if (error.statusCode === 404) code = "NOT_FOUND";

    throw new TRPCError({
      code,
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof z.ZodError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Input validation failed",
      cause: error,
    });
  }

  const message =
    error instanceof Error ? error.message : "An unknown error occurred";
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
    cause: error instanceof Error ? error : undefined,
  });
}
