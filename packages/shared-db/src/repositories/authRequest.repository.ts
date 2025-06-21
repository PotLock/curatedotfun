import { and, eq, gte } from "drizzle-orm";
import { InsertAuthRequest, authRequests } from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

export class AuthRequestRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async create(data: InsertAuthRequest) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .insert(authRequests)
            .values(data)
            .returning();
          return result[0] ?? null;
        }, this.db);
      },
      {
        operationName: "create auth request",
        additionalContext: { data },
      },
    );
  }

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
            .orderBy(authRequests.createdAt)
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

  async deleteById(id: number): Promise<boolean> {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .delete(authRequests)
            .where(eq(authRequests.id, id))
            .returning();
          return result.length > 0;
        }, this.db);
      },
      {
        operationName: "delete auth request by id",
        additionalContext: { id },
      },
      false,
    );
  }
}
