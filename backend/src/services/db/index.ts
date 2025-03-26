import { Pool, PoolClient, PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { logger } from "../../utils/logger";
import {
  executeWithRetry,
  DEFAULT_READ_POOL_CONFIG,
  DEFAULT_WRITE_POOL_CONFIG,
  withErrorHandling,
} from "./utils";

import * as queries from "./queries";

// Twitter
import {
  Moderation,
  SubmissionFeed,
  SubmissionStatus,
  TwitterCookie,
  TwitterSubmission,
  TwitterSubmissionWithFeedData,
} from "../../types/twitter";
import * as twitterQueries from "../twitter/queries";

/**
 * DatabaseService provides a centralized interface for all database operations.
 * Implements read/write separation and follows PostgreSQL best practices.
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;

  // Connection pools
  private writePool: Pool | null = null;
  private readPool: Pool | null = null;

  // Drizzle instances
  private writeDb: NodePgDatabase<any> | null = null;
  private readDb: NodePgDatabase<any> | null = null;

  private isConnected: boolean = false;

  /**
   * Private constructor to prevent direct instantiation.
   * Use DatabaseService.getInstance() instead.
   */
  private constructor() {}

  /**
   * Get the singleton instance of DatabaseService.
   * Creates a new instance if one doesn't exist.
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Establishes connections to the database.
   * Creates separate pools for read and write operations.
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const writeConnectionString =
        process.env.DATABASE_WRITE_URL || process.env.DATABASE_URL;
      const readConnectionString =
        process.env.DATABASE_READ_URL || process.env.DATABASE_URL;

      if (!writeConnectionString) {
        throw new Error(
          "DATABASE_URL or DATABASE_WRITE_URL environment variable is required",
        );
      }

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

      // Set statement timeout to prevent long-running queries
      await this.setPoolDefaults(this.writePool, DEFAULT_WRITE_POOL_CONFIG);
      await this.setPoolDefaults(this.readPool, DEFAULT_READ_POOL_CONFIG);

      // Initialize Drizzle instances
      this.writeDb = drizzle(this.writePool);
      this.readDb = drizzle(this.readPool);

      this.isConnected = true;
      logger.info("Database connections established");
    } catch (e: any) {
      logger.error("Failed to initialize database:", {
        error: e,
        dirname: __dirname,
        cwd: process.cwd(),
      });
      throw new Error(`Database initialization failed: ${e.message}`);
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
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.writeDb || !this.readDb) {
      throw new Error("Database connections not established");
    }
  }

  /**
   * Executes a database operation with retry logic for transient errors.
   * Uses the executeWithRetry utility function with async-retry.
   *
   * @param operation Function that performs the database operation
   * @param isWrite Whether this is a write operation (uses write pool)
   */
  private async executeWithRetry<T>(
    operation: (db: NodePgDatabase<any>) => Promise<T>,
    isWrite: boolean = false,
  ): Promise<T> {
    await this.ensureConnection();

    const db = isWrite ? this.writeDb! : this.readDb!;
    return executeWithRetry(operation, db);
  }

  /**
   * Executes a transaction with proper error handling and retries.
   * @param operations Function that performs operations within the transaction
   */
  public async transaction<T>(
    operations: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    await this.ensureConnection();

    const client = await this.writePool!.connect();
    try {
      await client.query("BEGIN");
      const result = await operations(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async saveSubmission(submission: TwitterSubmission): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.saveSubmission(db, submission);
    }, true); // Write operation
  }

  async saveModerationAction(moderation: Moderation): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.saveModerationAction(db, moderation);
    }, true); // Write operation
  }

  async updateSubmissionFeedStatus(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus,
    moderationResponseTweetId: string,
  ): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.updateSubmissionFeedStatus(
        db,
        submissionId,
        feedId,
        status,
        moderationResponseTweetId,
      );
    }, true); // Write operation
  }

  async getSubmission(tweetId: string): Promise<TwitterSubmission | null> {
    return await this.executeWithRetry(async (db) => {
      return await queries.getSubmission(db, tweetId);
    }); // Read operation (default)
  }

  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<TwitterSubmission | null> {
    return await this.executeWithRetry(async (db) => {
      return await queries.getSubmissionByCuratorTweetId(db, curatorTweetId);
    }); // Read operation
  }

  async getAllSubmissions(
    status?: string,
  ): Promise<TwitterSubmissionWithFeedData[]> {
    return await this.executeWithRetry(async (db) => {
      return await queries.getAllSubmissions(db, status);
    }); // Read operation
  }

  async getDailySubmissionCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    // Clean up old entries first (write operation)
    await this.executeWithRetry(async (db) => {
      await queries.cleanupOldSubmissionCounts(db, today);
    }, true);

    // Then get the count (read operation)
    return await this.executeWithRetry(async (db) => {
      return await queries.getDailySubmissionCount(db, userId, today);
    });
  }

  async incrementDailySubmissionCount(userId: string): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.incrementDailySubmissionCount(db, userId);
    }, true); // Write operation
  }

  async upsertFeeds(
    feeds: { id: string; name: string; description?: string }[],
  ): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.upsertFeeds(db, feeds);
    }, true); // Write operation
  }

  async saveSubmissionToFeed(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus = SubmissionStatus.PENDING,
  ): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.saveSubmissionToFeed(db, submissionId, feedId, status);
    }, true); // Write operation
  }

  async getFeedsBySubmission(submissionId: string): Promise<SubmissionFeed[]> {
    return await this.executeWithRetry(async (db) => {
      return await queries.getFeedsBySubmission(db, submissionId);
    }); // Read operation
  }

  async removeFromSubmissionFeed(
    submissionId: string,
    feedId: string,
  ): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.removeFromSubmissionFeed(db, submissionId, feedId);
    }, true); // Write operation
  }

  async getSubmissionsByFeed(feedId: string): Promise<
    (TwitterSubmission & {
      status: SubmissionStatus;
      moderationResponseTweetId?: string;
    })[]
  > {
    return await this.executeWithRetry(async (db) => {
      return await queries.getSubmissionsByFeed(db, feedId);
    }); // Read operation
  }

  // Feed Plugin Management
  async getFeedPlugin(feedId: string, pluginId: string) {
    return await this.executeWithRetry(async (db) => {
      return await queries.getFeedPlugin(db, feedId, pluginId);
    }); // Read operation
  }

  async upsertFeedPlugin(
    feedId: string,
    pluginId: string,
    config: Record<string, any>,
  ): Promise<void> {
    await this.executeWithRetry(async (db) => {
      await queries.upsertFeedPlugin(db, feedId, pluginId, config);
    }, true); // Write operation
  }

  // Twitter Cookie Management
  async setTwitterCookies(
    username: string,
    cookies: TwitterCookie[] | null,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const cookiesJson = JSON.stringify(cookies);
        await this.executeWithRetry(async (db) => {
          await twitterQueries.setTwitterCookies(db, username, cookiesJson);
        }, true); // Write operation
      },
      {
        operationName: "set Twitter cookies",
        additionalContext: { username },
      },
    );
  }

  async getTwitterCookies(username: string): Promise<TwitterCookie[] | null> {
    return withErrorHandling(
      async () => {
        const result = await this.executeWithRetry(async (db) => {
          return await twitterQueries.getTwitterCookies(db, username);
        }); // Read operation

        if (!result) return null;
        return JSON.parse(result.cookies) as TwitterCookie[];
      },
      {
        operationName: "get Twitter cookies",
        additionalContext: { username },
      },
    );
  }

  async deleteTwitterCookies(username: string): Promise<void> {
    return withErrorHandling(
      async () => {
        await this.executeWithRetry(async (db) => {
          await twitterQueries.deleteTwitterCookies(db, username);
        }, true); // Write operation
      },
      {
        operationName: "delete Twitter cookies",
        additionalContext: { username },
      },
    );
  }

  // Twitter Cache Management
  async setTwitterCacheValue(key: string, value: string): Promise<void> {
    return withErrorHandling(
      async () => {
        await this.executeWithRetry(async (db) => {
          await twitterQueries.setTwitterCacheValue(db, key, value);
        }, true); // Write operation
      },
      {
        operationName: "set Twitter cache value",
        additionalContext: { key },
      },
    );
  }

  async getTwitterCacheValue(key: string): Promise<string | null> {
    return withErrorHandling(
      async () => {
        const result = await this.executeWithRetry(async (db) => {
          return await twitterQueries.getTwitterCacheValue(db, key);
        }); // Read operation

        return result?.value ?? null;
      },
      {
        operationName: "get Twitter cache value",
        additionalContext: { key },
      },
    );
  }

  async deleteTwitterCacheValue(key: string): Promise<void> {
    return withErrorHandling(
      async () => {
        await this.executeWithRetry(async (db) => {
          await twitterQueries.deleteTwitterCacheValue(db, key);
        }, true); // Write operation
      },
      {
        operationName: "delete Twitter cache value",
        additionalContext: { key },
      },
    );
  }

  async clearTwitterCache(): Promise<void> {
    return withErrorHandling(
      async () => {
        await this.executeWithRetry(async (db) => {
          await twitterQueries.clearTwitterCache(db);
        }, true); // Write operation
      },
      { operationName: "clear Twitter cache" },
    );
  }

  async getLeaderboard(
    timeRange: string = "all",
  ): Promise<queries.LeaderboardEntry[]> {
    return withErrorHandling(
      async () => {
        return await this.executeWithRetry(async (db) => {
          return queries.getLeaderboard(db, timeRange);
        }); // Read operation
      },
      { operationName: "get leaderboard" },
    );
  }

  async getPostsCount(): Promise<number> {
    return withErrorHandling(
      async () => {
        return await this.executeWithRetry(async (db) => {
          return await queries.getPostsCount(db);
        }); // Read operation
      },
      { operationName: "get posts count" },
      0, // Default value if operation fails
    );
  }

  async getCuratorsCount(): Promise<number> {
    return withErrorHandling(
      async () => {
        return await this.executeWithRetry(async (db) => {
          return await queries.getCuratorsCount(db);
        }); // Read operation
      },
      { operationName: "get curators count" },
      0, // Default value if operation fails
    );
  }

  /**
   * Checks if the database connection is healthy.
   * Useful for health checks and monitoring.
   */
  async healthCheck(): Promise<{
    status: "ok" | "error";
    readResponseTime?: number;
    writeResponseTime?: number;
    error?: string;
  }> {
    return withErrorHandling(
      async () => {
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
      },
      { operationName: "perform database health check" },
    );
  }
}

// Initialize the singleton instance
const dbInstance = DatabaseService.getInstance();

// Export the singleton instance
export const db = dbInstance;

export const initializeDatabase = async () => {
  try {
    await dbInstance.connect();
    return true;
  } catch (err) {
    logger.error("Failed to establish database connection:", { err });
    return false;
  }
};

// For testing and dependency injection
export const getDatabase = (): DatabaseService => {
  return DatabaseService.getInstance();
};
