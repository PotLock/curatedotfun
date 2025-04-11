import { PoolClient } from "pg";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { logger } from "../../utils/logger";
import { executeWithRetry } from "./utils";
import { dbConnection } from "./connection";

/**
 * Executes a database operation with retry logic for transient errors.
 * Uses the executeWithRetry utility function with async-retry.
 *
 * @param operation Function that performs the database operation
 * @param isWrite Whether this is a write operation (uses write pool)
 */
export async function executeOperation<T>(
  operation: (db: NodePgDatabase<any>) => Promise<T>,
  isWrite: boolean = false,
): Promise<T> {
  await dbConnection.ensureConnection();

  const db = isWrite ? dbConnection.getWriteDb() : dbConnection.getReadDb();
  return executeWithRetry(operation, db);
}

/**
 * Executes a transaction with proper error handling and retries.
 * @param operations Function that performs operations within the transaction
 */
export async function executeTransaction<T>(
  operations: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await dbConnection.ensureConnection();

  const client = await dbConnection.getWritePool().connect();
  try {
    await client.query("BEGIN");
    const result = await operations(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Transaction failed, rolling back", { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Wraps a database operation with error handling.
 * Provides consistent error handling and logging for database operations.
 *
 * @param operation The database operation to execute
 * @param options Options for error handling
 * @param defaultValue Optional default value to return on error
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    operationName: string;
    additionalContext?: Record<string, any>;
  },
  defaultValue?: T,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Extract basic error properties
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    // Extract PostgreSQL-specific error properties if they exist
    const errorDetails: Record<string, any> = {
      message: errorMessage,
      stack: errorStack,
    };
    // Handle PostgreSQL errors which often have additional properties
    if (error instanceof Error && typeof error === "object") {
      // Extract common PostgreSQL error properties
      const pgErrorProps = [
        "code",
        "detail",
        "hint",
        "position",
        "internalPosition",
        "internalQuery",
        "where",
        "schema",
        "table",
        "column",
        "dataType",
        "constraint",
        "severity",
      ];
      for (const prop of pgErrorProps) {
        if (prop in error) {
          errorDetails[prop] = (error as any)[prop];
        }
      }
      // Check for nested error objects
      if ("original" in error) {
        errorDetails.original = {};
        const original = (error as any).original;
        for (const prop of [...pgErrorProps, "message", "stack"]) {
          if (original && prop in original) {
            errorDetails.original[prop] = original[prop];
          }
        }
      }
    }
    logger.error({ error: errorDetails }, `Failed to ${options.operationName}`);

    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}
