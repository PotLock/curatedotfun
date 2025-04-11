import { logger } from "../../utils/logger";
import retry from "async-retry";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PoolConfig } from "pg";

/**
 * List of PostgreSQL error codes that are considered transient/retryable
 * These are typically connection-related errors that might resolve on retry
 */
export const RETRYABLE_ERROR_CODES = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND", // Network errors
  "08000",
  "08003",
  "08006",
  "08001",
  "08004",
  "57P01", // PostgreSQL connection errors
  "40001",
  "40P01", // Serialization/deadlock errors
  "53300",
  "53400",
  "55P03",
  "57014", // Resource/query timeout errors
];

/**
 * Default configuration for write database pool
 */
export const DEFAULT_WRITE_POOL_CONFIG: PoolConfig = {
  max: 10, // Fewer connections for writes
  min: 2, // Minimum idle connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds
  allowExitOnIdle: true,
  statement_timeout: 30000, // 30 seconds
};

/**
 * Default configuration for read database pool
 */
export const DEFAULT_READ_POOL_CONFIG: PoolConfig = {
  max: 20, // More connections for reads
  min: 5, // Minimum idle connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds
  allowExitOnIdle: true,
  statement_timeout: 60000, // 60 seconds
};

/**
 * Determines if an error is retryable (connection-related)
 */
export function isRetryableError(error: any): boolean {
  return RETRYABLE_ERROR_CODES.some(
    (code) =>
      error.code === code || (error.original && error.original.code === code),
  );
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: retry.Options = {
  retries: 3,
  factor: 2,
  minTimeout: 100,
  maxTimeout: 3000,
  randomize: true,
  onRetry: (error: any, attempt: number) => {
    const maxRetries = 3; // Same as retries above
    const isLastAttempt = attempt === maxRetries;

    logger.warn(
      `Database operation failed (attempt ${attempt}/${maxRetries})`,
      {
        error: error.message,
        code: error.code,
        isLastAttempt,
      },
    );
  },
};

/**
 * Execute a database operation with retry logic
 * Uses async-retry library for simplified retry handling
 *
 * @param operation Function that performs the database operation
 * @param db Drizzle database instance
 * @param options Retry options (optional)
 * @returns Result of the operation
 */
export async function executeWithRetry<T>(
  operation: (db: NodePgDatabase<any>) => Promise<T>,
  db: NodePgDatabase<any>,
  options: retry.Options = DEFAULT_RETRY_OPTIONS,
): Promise<T> {
  return retry(async (bail) => {
    try {
      return await operation(db);
    } catch (error: any) {
      // Only retry on connection errors, not query errors
      if (!isRetryableError(error)) {
        bail(error);
        return Promise.reject(error);
      }
      throw error; // Will be caught by retry
    }
  }, options);
}

/**
 * Wraps a database operation with standardized error handling
 *
 * @param operation The database operation to execute
 * @param context Additional context for error logging
 * @param defaultValue Optional default value to return on error
 * @returns Result of the operation or default value on error
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    errorMessage?: string;
    additionalContext?: Record<string, any>;
  },
  defaultValue?: T,
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const { operationName, errorMessage, additionalContext } = context;

    logger.error(`Failed to ${operationName}:`, {
      error: error.message,
      code: error.code,
      ...additionalContext,
    });

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(
      errorMessage || `Failed to ${operationName}: ${error.message}`,
    );
  }
}
