import { Pool, PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { logger } from "../../utils/logger";
import { DEFAULT_READ_POOL_CONFIG, DEFAULT_WRITE_POOL_CONFIG } from "./utils";

/**
 * DatabaseConnection manages the database connection pools and provides
 * access to Drizzle instances for database operations.
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;

  // Connection pools
  private writePool: Pool | null = null;
  private readPool: Pool | null = null;

  // Drizzle instances
  private writeDb: NodePgDatabase<any> | null = null;
  private readDb: NodePgDatabase<any> | null = null;

  private isConnected: boolean = false;

  /**
   * Private constructor to prevent direct instantiation.
   * Use DatabaseConnection.getInstance() instead.
   */
  private constructor() {}

  /**
   * Get the singleton instance of DatabaseConnection.
   * Creates a new instance if one doesn't exist.
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Validates database connection parameters and throws an error if they're invalid
   * @throws Error if DATABASE_URL is not set
   */
  private validateConnectionParams(): void {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl || dbUrl.trim() === "") {
      throw new Error("DATABASE_URL environment variable is not set or empty");
    }
  }

  /**
   * Establishes connections to the database.
   * Creates separate pools for read and write operations.
   * @throws Error if connection fails or if DATABASE_URL is not set
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Validate connection parameters first
      this.validateConnectionParams();

      const writeConnectionString =
        process.env.DATABASE_WRITE_URL || process.env.DATABASE_URL;
      const readConnectionString =
        process.env.DATABASE_READ_URL || process.env.DATABASE_URL;

      // Configure write pool (primary)
      this.writePool = new Pool({
        connectionString: writeConnectionString,
        ...DEFAULT_WRITE_POOL_CONFIG,
      });

      // Configure read pool (can be replicas)
      this.readPool = new Pool({
        connectionString: readConnectionString,
        ...DEFAULT_READ_POOL_CONFIG,
      });

      // Add event listeners for pool errors
      this.writePool.on("error", (err) => {
        logger.error("Unexpected error on write pool", err);
      });

      this.readPool.on("error", (err) => {
        logger.error("Unexpected error on read pool", err);
      });

      await this.setPoolDefaults(this.writePool, DEFAULT_WRITE_POOL_CONFIG);
      await this.setPoolDefaults(this.readPool, DEFAULT_READ_POOL_CONFIG);

      // Initialize Drizzle instances
      this.writeDb = drizzle(this.writePool);
      this.readDb = drizzle(this.readPool);

      this.isConnected = true;
      logger.info("Database connections established successfully");
    } catch (e: any) {
      const errorMessage = e.message || String(e);
      const errorCode = (e as any).code;

      // Provide a single comprehensive error message
      if (errorMessage.includes("DATABASE_URL")) {
        // Don't log the stack trace for environment variable issues
        // as it's not a code error but a configuration issue
        logger.error("DATABASE_URL environment variable is not set or empty");
      } else {
        // For other database errors, log more details
        logger.error("Failed to initialize database:", {
          error: errorMessage,
          code: errorCode,
          stack: e.stack,
        });

        // Provide helpful context based on error code
        if (errorCode === "ECONNREFUSED") {
          logger.error(
            "Connection refused. Make sure the database server is running and accessible.",
          );
        } else if (errorCode === "ENOTFOUND") {
          logger.error(
            "Host not found. Check the hostname in your DATABASE_URL.",
          );
        } else if (errorCode === "28P01") {
          logger.error(
            "Authentication failed. Check your database username and password.",
          );
        } else if (errorCode === "3D000") {
          logger.error(
            "Database does not exist. Make sure the database has been created.",
          );
        }
      }

      throw e; // Re-throw the original error to allow proper handling upstream
    }
  }

  /**
   * Sets default parameters for a connection pool
   */
  private async setPoolDefaults(pool: Pool, config: PoolConfig): Promise<void> {
    if (!pool) return;

    const client = await pool.connect();
    try {
      if (config.statement_timeout) {
        await client.query(
          `SET statement_timeout = ${config.statement_timeout}`,
        );
      }
    } finally {
      client.release();
    }
  }

  /**
   * Closes database connections with proper draining.
   * Safe to call even if not connected.
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      // Set a timeout for force closing connections
      const forceCloseTimeout = setTimeout(() => {
        logger.warn("Force closing database connections after timeout");
        if (this.writePool) this.writePool.end();
        if (this.readPool) this.readPool.end();
      }, 5000);

      // Try graceful shutdown
      if (this.writePool) await this.writePool.end();
      if (this.readPool) await this.readPool.end();

      clearTimeout(forceCloseTimeout);

      this.writePool = null;
      this.readPool = null;
      this.writeDb = null;
      this.readDb = null;
      this.isConnected = false;

      logger.info("Database connections closed");
    } catch (error) {
      logger.error("Error during database disconnect", { error });
      // Still reset the state even if there was an error
      this.writePool = null;
      this.readPool = null;
      this.writeDb = null;
      this.readDb = null;
      this.isConnected = false;
    }
  }

  /**
   * Ensures database connections are established.
   * @throws Error if connection fails
   */
  public async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.writeDb || !this.readDb) {
      throw new Error("Database connections not established");
    }
  }

  /**
   * Get the write database instance
   * @returns The write database instance
   */
  public getWriteDb(): NodePgDatabase<any> {
    if (!this.writeDb) {
      throw new Error("Write database connection not established");
    }
    return this.writeDb;
  }

  /**
   * Get the read database instance
   * @returns The read database instance
   */
  public getReadDb(): NodePgDatabase<any> {
    if (!this.readDb) {
      throw new Error("Read database connection not established");
    }
    return this.readDb;
  }

  /**
   * Get the write pool
   * @returns The write pool
   */
  public getWritePool(): Pool {
    if (!this.writePool) {
      throw new Error("Write pool not established");
    }
    return this.writePool;
  }

  /**
   * Checks if the database connection is healthy.
   * Useful for health checks and monitoring.
   */
  public async healthCheck(): Promise<{
    status: "ok" | "error";
    readResponseTime?: number;
    writeResponseTime?: number;
    error?: string;
  }> {
    try {
      await this.ensureConnection();

      // Check read pool
      const readStart = Date.now();
      await this.readPool!.query("SELECT 1");
      const readDuration = Date.now() - readStart;

      // Check write pool
      const writeStart = Date.now();
      await this.writePool!.query("SELECT 1");
      const writeDuration = Date.now() - writeStart;

      logger.info("Database health check", {
        status: "ok",
        readResponseTime: readDuration,
        writeResponseTime: writeDuration,
      });

      return {
        status: "ok",
        readResponseTime: readDuration,
        writeResponseTime: writeDuration,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error("Database health check failed", { error: errorMessage });

      return {
        status: "error",
        error: errorMessage,
      };
    }
  }
}

// Initialize the singleton instance
export const dbConnection = DatabaseConnection.getInstance();

/**
 * Initializes the database connection.
 * This is the single entry point for database initialization.
 *
 * @returns Promise<boolean> - true if connection was successful, false otherwise
 */
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    await dbConnection.connect();
    return true;
  } catch (err) {
    // Error logging is already handled in the connect method
    return false;
  }
};
