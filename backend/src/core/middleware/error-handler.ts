import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../../utils/logger';
import { isAppError } from '../errors';

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Options for the error handler middleware
 */
export interface ErrorHandlerOptions {
  /**
   * Whether to include stack traces in error responses (default: false in production)
   */
  includeStack?: boolean;

  /**
   * Whether to include error details in responses (default: true)
   */
  includeDetails?: boolean;

  /**
   * Custom error formatter
   */
  formatter?: (err: Error, c: Context) => ErrorResponse;
}

/**
 * Create an error handler middleware
 * @param options Error handler options
 * @returns An error handler function
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    includeStack = process.env.NODE_ENV !== 'production',
    includeDetails = true,
  } = options;

  return async (err: Error, c: Context) => {
    // Log the error
    logger.error(`Error handling request: ${err.message}`, {
      path: c.req.path,
      method: c.req.method,
      error: err,
    });

    // Custom formatter takes precedence
    if (options.formatter) {
      const response = options.formatter(err, c);
      return c.json(response, response.code ? parseInt(response.code) as any : 500 as any);
    }

    // Handle AppError instances
    if (isAppError(err)) {
      const response: ErrorResponse = {
        error: err.constructor.name,
        message: err.message,
        code: err.errorCode,
      };

      // Include details if available and allowed
      if (includeDetails && err.context) {
        response.details = err.context;
      }

      // Include stack trace if allowed
      if (includeStack) {
        response.stack = err.stack;
      }

      return c.json(response, err.statusCode as any);
    }

    // Handle Hono's built-in HTTPException
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    // Handle generic errors
    const response: ErrorResponse = {
      error: 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
    };

    // Include stack trace if allowed
    if (includeStack) {
      response.stack = err.stack;
    }

    return c.json(response, 500 as any);
  };
}

/**
 * Default error handler middleware
 */
export const errorHandler = createErrorHandler();
