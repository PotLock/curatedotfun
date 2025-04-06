import { TwitterCookie } from "../../../types/twitter";
import * as twitterQueries from "../../twitter/queries";
import { executeOperation, withDatabaseErrorHandling } from "../transaction";

/**
 * Repository for Twitter-related database operations.
 */
export class TwitterRepository {
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
    return withDatabaseErrorHandling(
      async () => {
        const cookiesJson = JSON.stringify(cookies);
        await executeOperation(async (db) => {
          await twitterQueries.setTwitterCookies(db, username, cookiesJson);
        }, true); // Write operation
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
    return withDatabaseErrorHandling(
      async () => {
        const result = await executeOperation(async (db) => {
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

  /**
   * Deletes Twitter cookies for a user.
   *
   * @param username Twitter username
   */
  async deleteTwitterCookies(username: string): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await twitterQueries.deleteTwitterCookies(db, username);
        }, true); // Write operation
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
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await twitterQueries.setTwitterCacheValue(db, key, value);
        }, true); // Write operation
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
    return withDatabaseErrorHandling(
      async () => {
        const result = await executeOperation(async (db) => {
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

  /**
   * Deletes a Twitter cache value.
   *
   * @param key Cache key
   */
  async deleteTwitterCacheValue(key: string): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await twitterQueries.deleteTwitterCacheValue(db, key);
        }, true); // Write operation
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
    return withDatabaseErrorHandling(
      async () => {
        await executeOperation(async (db) => {
          await twitterQueries.clearTwitterCache(db);
        }, true); // Write operation
      },
      { operationName: "clear Twitter cache" },
    );
  }
}

// Export a singleton instance
export const twitterRepository = new TwitterRepository();
