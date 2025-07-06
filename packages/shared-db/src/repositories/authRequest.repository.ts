import { and, eq, desc, gte, lt } from "drizzle-orm";
import { InsertAuthRequest, authRequests } from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import type { DB } from "../types";

export class AuthRequestRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Create a new auth request
   * @param data The auth request data to insert
   * @param txDb Optional transaction DB instance
   * @returns The created auth request
   */
  async create(data: InsertAuthRequest, txDb?: DB) {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .insert(authRequests)
            .values(data)
            .returning();
          return result[0] ?? null;
        }, dbToUse);
      },
      {
        operationName: "create auth request",
        additionalContext: { data },
      },
    );
  }

  /**
   * Find the latest auth request for an account
   * @param accountId The account ID
   * @returns The latest auth request or null if not found
   */
  async findLatestByAccountId(accountId: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const result = await dbInstance
            .select()
            .from(authRequests)
            .where(
              and(
                eq(authRequests.accountId, accountId),
                gte(authRequests.createdAt, fiveMinutesAgo),
              ),
            )
            .orderBy(desc(authRequests.createdAt))
            .limit(1);
          return result[0] ?? null;
        }, this.db);
      },
      {
        operationName: "find latest auth request by account id",
        additionalContext: { accountId },
      },
      null,
    );
  }

  /**
   * Delete an auth request by ID
   * @param id The auth request ID
   * @param txDb Optional transaction DB instance
   * @returns True if the auth request was deleted, false otherwise
   */
  async deleteByAccountId(accountId: string, txDb?: DB): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .delete(authRequests)
            .where(eq(authRequests.accountId, accountId))
            .returning();
          return result.length > 0;
        }, dbToUse);
      },
      {
        operationName: "delete auth request by account id",
        additionalContext: { accountId },
      },
      false,
    );
  }

  /**
   * Delete an auth request by ID
   * @param id The auth request ID
   * @param txDb Optional transaction DB instance
   * @returns True if the auth request was deleted, false otherwise
   */
  async deleteById(id: number, txDb?: DB): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .delete(authRequests)
            .where(eq(authRequests.id, id))
            .returning();
          return result.length > 0;
        }, dbToUse);
      },
      {
        operationName: "delete auth request by id",
        additionalContext: { id },
      },
      false,
    );
  }

  /**
   * Delete all expired auth requests
   * @param txDb Optional transaction DB instance
   * @returns The number of auth requests deleted
   */
  async deleteExpired(txDb?: DB): Promise<number> {
    return withErrorHandling(
      async () => {
        const dbToUse = txDb || this.db;
        return executeWithRetry(async (dbInstance) => {
          const now = new Date();
          const result = await dbInstance
            .delete(authRequests)
            .where(lt(authRequests.expiresAt, now))
            .returning();
          return result.length;
        }, dbToUse);
      },
      {
        operationName: "delete expired auth requests",
      },
      0,
    );
  }
}
