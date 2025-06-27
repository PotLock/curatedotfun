import { eq } from "drizzle-orm";
import * as schema from "../schema";
import type { DB } from "../types";
import { executeWithRetry, withErrorHandling } from "../utils";

export interface TwitterConfig {
  username: string;
  password: string;
  email: string;
}

export interface TwitterCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Repository for Twitter-related database operations.
 */
export class TwitterRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Sets Twitter cookies for a user.
   *
   * @param username Twitter username
   * @param cookies Twitter cookies
   * @param txDb Optional transaction DB instance
   */
  async setTwitterCookies(
    username: string,
    cookies: TwitterCookie[] | null,
    txDb?: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        const cookiesJson = JSON.stringify(cookies);
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .insert(schema.twitterCookies)
            .values({
              username,
              cookies: cookiesJson,
            })
            .onConflictDoUpdate({
              target: schema.twitterCookies.username,
              set: {
                cookies: cookiesJson,
                updatedAt: new Date(),
              },
            });
        }, dbToUse);
      },
      {
        operationName: "set Twitter cookies",
        additionalContext: { username },
      },
    );
  }

  /**
   * Gets Twitter cookies for a user.
   *
   * @param username Twitter username
   * @returns Twitter cookies or null if not found
   */
  async getTwitterCookies(username: string): Promise<TwitterCookie[] | null> {
    return withErrorHandling(
      async () => {
        const result = await executeWithRetry(async (dbInstance) => {
          return dbInstance
            .select({ cookies: schema.twitterCookies.cookies }) // Select only the cookies column
            .from(schema.twitterCookies)
            .where(eq(schema.twitterCookies.username, username))
            .then((rows) => rows[0] || null);
        }, this.db);

        if (!result || typeof result.cookies !== "string") {
          return null;
        }
        try {
          return JSON.parse(result.cookies) as TwitterCookie[];
        } catch (error) {
          console.error(
            `Failed to parse Twitter cookies for ${username}:`,
            error,
          );
          return null;
        }
      },
      {
        operationName: "get Twitter cookies",
        additionalContext: { username },
      },
      null, // Default value in case of error
    );
  }

  /**
   * Deletes Twitter cookies for a user.
   *
   * @param username Twitter username
   * @param txDb Optional transaction DB instance
   */
  async deleteTwitterCookies(username: string, txDb?: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .delete(schema.twitterCookies)
            .where(eq(schema.twitterCookies.username, username));
        }, dbToUse);
      },
      {
        operationName: "delete Twitter cookies",
        additionalContext: { username },
      },
    );
  }

  /**
   * Sets a Twitter cache value.
   *
   * @param key Cache key
   * @param value Cache value
   * @param txDb Optional transaction DB instance
   */
  async setTwitterCacheValue(
    key: string,
    value: string,
    txDb?: DB,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .insert(schema.twitterCache)
            .values({
              key,
              value,
            })
            .onConflictDoUpdate({
              target: schema.twitterCache.key,
              set: {
                value,
                updatedAt: new Date(),
              },
            });
        }, dbToUse);
      },
      {
        operationName: "set Twitter cache value",
        additionalContext: { key },
      },
    );
  }

  /**
   * Gets a Twitter cache value.
   *
   * @param key Cache key
   * @returns Cache value or null if not found
   */
  async getTwitterCacheValue(key: string): Promise<string | null> {
    return withErrorHandling(
      async () => {
        const result = await executeWithRetry(async (dbInstance) => {
          return dbInstance
            .select({ value: schema.twitterCache.value }) // Select only the value column
            .from(schema.twitterCache)
            .where(eq(schema.twitterCache.key, key))
            .then((rows) => rows[0] || null);
        }, this.db);

        return result?.value ?? null;
      },
      {
        operationName: "get Twitter cache value",
        additionalContext: { key },
      },
      null,
    );
  }

  /**
   * Deletes a Twitter cache value.
   *
   * @param key Cache key
   * @param txDb Optional transaction DB instance
   */
  async deleteTwitterCacheValue(key: string, txDb?: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance
            .delete(schema.twitterCache)
            .where(eq(schema.twitterCache.key, key));
        }, dbToUse);
      },
      {
        operationName: "delete Twitter cache value",
        additionalContext: { key },
      },
    );
  }

  /**
   * Clears the Twitter cache.
   *
   * @param txDb Optional transaction DB instance
   */
  async clearTwitterCache(txDb?: DB): Promise<void> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          await dbInstance.delete(schema.twitterCache);
        }, dbToUse);
      },
      { operationName: "clear Twitter cache" },
    );
  }
}
