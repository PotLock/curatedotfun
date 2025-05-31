import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { DB } from "../validators";
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
   */
  async setTwitterCookies(
    username: string,
    cookies: TwitterCookie[] | null,
  ): Promise<void> {
    return withErrorHandling(
      async () => {
        const cookiesJson = JSON.stringify(cookies);
        await executeWithRetry(async (dbInstance) => {
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
        }, this.db);
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
   */
  async deleteTwitterCookies(username: string): Promise<void> {
    return withErrorHandling(
      async () => {
        await executeWithRetry(async (dbInstance) => {
          await dbInstance
            .delete(schema.twitterCookies)
            .where(eq(schema.twitterCookies.username, username));
        }, this.db);
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
   */
  async setTwitterCacheValue(key: string, value: string): Promise<void> {
    return withErrorHandling(
      async () => {
        await executeWithRetry(async (dbInstance) => {
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
        }, this.db);
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
   */
  async deleteTwitterCacheValue(key: string): Promise<void> {
    return withErrorHandling(
      async () => {
        await executeWithRetry(async (dbInstance) => {
          await dbInstance
            .delete(schema.twitterCache)
            .where(eq(schema.twitterCache.key, key));
        }, this.db);
      },
      {
        operationName: "delete Twitter cache value",
        additionalContext: { key },
      },
    );
  }

  /**
   * Clears the Twitter cache.
   */
  async clearTwitterCache(): Promise<void> {
    return withErrorHandling(
      async () => {
        await executeWithRetry(async (dbInstance) => {
          await dbInstance.delete(schema.twitterCache);
        }, this.db);
      },
      { operationName: "clear Twitter cache" },
    );
  }
}
