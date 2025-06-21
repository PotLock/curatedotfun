import { eq, sql } from "drizzle-orm";
import { InsertUser, UpdateUser, users } from "../schema";
import { executeWithRetry, withErrorHandling } from "../utils";
import { DB } from "../validators";

export class UserRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Find a user by their authProviderId
   * @param authProviderId The provider ID from Web3Auth
   * @returns The user if found, null otherwise
   */
  async findByAuthProviderId(authProviderId: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(users)
            .where(eq(users.authProviderId, authProviderId))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "find user by authProviderId",
        additionalContext: { authProviderId },
      },
      null,
    );
  }

  /**
   * Find a user by their NEAR account ID
   * @param nearAccountId The NEAR account ID
   * @returns The user if found, null otherwise
   */
  async findByNearAccountId(nearAccountId: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(users)
            .where(eq(users.nearAccountId, nearAccountId))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "find user by NEAR account ID",
        additionalContext: { nearAccountId },
      },
      null,
    );
  }

  /**
   * Find a user by their NEAR public key
   * @param nearPublicKey The NEAR public key
   * @returns The user if found, null otherwise
   */
  async findByNearPublicKey(nearPublicKey: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(users)
            .where(eq(users.nearPublicKey, nearPublicKey))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "find user by NEAR public key",
        additionalContext: { nearPublicKey },
      },
      null,
    );
  }

  /**
   * Create a new user
   * @param userData The user data to insert
   * @returns The created user
   * @throws DatabaseError if the user could not be created
   */
  async createUser(userData: InsertUser, txDb: DB) {
    return withErrorHandling(
      async () => {
        try {
          const insertResult = await txDb
            .insert(users)
            .values(userData)
            .returning();

          const newUser = insertResult[0];
          if (!newUser) {
            throw new Error("Failed to insert user into database");
          }

          return newUser;
        } catch (error: unknown) {
          // Handle unique constraint violations
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
          ) {
            // Extract the constraint name to provide a more specific error message
            const detail =
              "detail" in error && typeof error.detail === "string"
                ? error.detail
                : "";
            const constraintMatch = detail.match(/Key \((.*?)\)=/);
            const field = constraintMatch ? constraintMatch[1] : "unknown";

            throw new Error(`A user with this ${field} already exists`, {
              cause: error,
            });
          }
          throw error;
        }
      },
      {
        operationName: "create user",
        additionalContext: { userData },
      },
    );
  }

  /**
   * Update a user by their NEAR account ID
   * @param nearAccountId The NEAR account ID of the user to update
   * @param userData The user data to update
   * @returns The updated user
   * @throws NotFoundError if the user does not exist
   */
  async updateByNearAccountId(
    nearAccountId: string,
    userData: UpdateUser,
    txDb: DB,
  ) {
    return withErrorHandling(
      async () => {
        const updateResult = await txDb
          .update(users)
          .set({
            ...userData,
            updatedAt: sql`NOW()`,
          })
          .where(eq(users.nearAccountId, nearAccountId))
          .returning();

        const updatedUser = updateResult[0];
        if (!updatedUser) {
          throw new Error(
            `User not found with NEAR account ID: ${nearAccountId}`,
          );
        }

        return updatedUser;
      },
      {
        operationName: "update user by NEAR account ID",
        additionalContext: { nearAccountId, userData },
      },
    );
  }

  /**
   * Update a user
   * @param authProviderId The provider ID of the user to update
   * @param userData The user data to update
   * @returns The updated user
   * @throws NotFoundError if the user does not exist
   */
  async updateUser(authProviderId: string, userData: UpdateUser, txDb: DB) {
    return withErrorHandling(
      async () => {
        const updateResult = await txDb
          .update(users)
          .set({ ...userData, updatedAt: sql`NOW()` })
          .where(eq(users.authProviderId, authProviderId))
          .returning();

        const updatedUser = updateResult[0];
        if (!updatedUser) {
          throw new Error(`User not found: ${authProviderId}`);
        }

        return updatedUser;
      },
      {
        operationName: "update user",
        additionalContext: { authProviderId, userData },
      },
    );
  }

  /**
   * Delete a user by their NEAR account ID
   * @param nearAccountId The NEAR account ID of the user to delete
   * @returns True if the user was deleted, false otherwise
   */
  async deleteByNearAccountId(
    nearAccountId: string,
    txDb: DB,
  ): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const deleteResult = await txDb
          .delete(users)
          .where(eq(users.nearAccountId, nearAccountId))
          .returning();

        return deleteResult.length > 0;
      },
      {
        operationName: "delete user by NEAR account ID",
        additionalContext: { nearAccountId },
      },
      false,
    );
  }

  /**
   * Delete a user
   * @param authProviderId The provider ID of the user to delete
   * @returns True if the user was deleted, false otherwise
   */
  async deleteUser(authProviderId: string, txDb: DB): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const deleteResult = await txDb
          .delete(users)
          .where(eq(users.authProviderId, authProviderId))
          .returning();

        return deleteResult.length > 0;
      },
      {
        operationName: "delete user",
        additionalContext: { authProviderId },
      },
      false,
    );
  }
}
