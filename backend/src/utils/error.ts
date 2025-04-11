import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "./logger";

/**
 * Error codes for API responses
 */
export enum ErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, c: Context) {
  logger.error(`Error handling request: ${err.message}`, {
    path: c.req.path,
    method: c.req.method,
    error: err,
  });

  // Hono's built-in error handling
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    500,
  );
}

/**
 * Helper to create a service unavailable error
 */
export function serviceUnavailable(service: string): HTTPException {
  return new HTTPException(503, {
    message: `${service} service not available`,
  });
}
