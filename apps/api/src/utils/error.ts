import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { PluginError } from "@curatedotfun/utils";
import type { Logger } from "pino";

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
export function errorHandler(err: Error, c: Context, logger: Logger) {
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

/**
 * Helper to create a bad request error
 * @param c - Hono context
 * @param message - Optional custom message
 * @param details - Optional details about the validation errors
 */
export function badRequest(
  c: Context,
  message = "Bad Request",
  details?: unknown,
) {
  const responseBody: { error: string; details?: unknown } = { error: message };
  if (details) {
    responseBody.details = details;
  }
  return c.json(responseBody, ErrorCode.BAD_REQUEST);
}

/**
 * Logs plugin errors in a standardized format with appropriate context
 * @param error - The plugin error to log
 * @param additionalContext - Optional additional context to include in the log
 */
export function logPluginError(
  error: PluginError,
  logger: Logger,
  additionalContext?: Record<string, unknown>,
) {
  const logData = {
    pluginName: error.context.pluginName,
    operation: error.context.operation,
    attempt: error.context.attempt,
    pluginErrorCode: error.pluginErrorCode,
    retryable: error.retryable,
    details: error.details,
    ...(error.originalError && {
      originalError: {
        name: error.originalError.name,
        message: error.originalError.message,
        stack: error.originalError.stack,
      },
    }),
    ...additionalContext,
  };

  // Use warn level for retryable errors, error level for non-retryable
  const logLevel = error.retryable ? "warn" : "error";
  logger[logLevel](`Plugin error: ${error.message}`, logData);
}
