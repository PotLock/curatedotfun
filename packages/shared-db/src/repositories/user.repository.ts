import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { DB, InsertUser, UpdateUser } from "../validators";
import { executeWithRetry, withErrorHandling } from "../utils";

export class UserRepository {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Find a user by their auth_provider_id
   * @param auth_provider_id The provider ID from Web3Auth
   * @returns The user if found, null otherwise
   */
  async findByAuthProviderId(auth_provider_id: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(schema.users)
            .where(eq(schema.users.auth_provider_id, auth_provider_id))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "find user by auth_provider_id",
        additionalContext: { auth_provider_id },
      },
      null,
    );
  }

  /**
   * Find a user by their NEAR account ID
   * @param near_account_id The NEAR account ID
   * @returns The user if found, null otherwise
   */
  async findByNearAccountId(near_account_id: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(schema.users)
            .where(eq(schema.users.near_account_id, near_account_id))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "find user by NEAR account ID",
        additionalContext: { near_account_id },
      },
      null,
    );
  }

  /**
   * Find a user by their NEAR public key
   * @param near_public_key The NEAR public key
   * @returns The user if found, null otherwise
   */
  async findByNearPublicKey(near_public_key: string) {
    return withErrorHandling(
      async () => {
        return executeWithRetry(async (dbInstance) => {
          const result = await dbInstance
            .select()
            .from(schema.users)
            .where(eq(schema.users.near_public_key, near_public_key))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        }, this.db);
      },
      {
        operationName: "find user by NEAR public key",
        additionalContext: { near_public_key },
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
            .insert(schema.users)
            .values({
              auth_provider_id: userData.auth_provider_id as string,
              near_account_id: userData.near_account_id,
              near_public_key: userData.near_public_key,
              username: userData.username || null,
              email: userData.email || null,
            })
            .returning();

          const newUser = insertResult[0];
          if (!newUser) {
            throw new Error("Failed to insert user into database");
          }

          return newUser;
        } catch (error: any) {
          // Handle unique constraint violations
          if (error?.code === "23505") {
            // Extract the constraint name to provide a more specific error message
            const constraintMatch = error.detail?.match(/Key \((.*?)\)=/);
            const field = constraintMatch ? constraintMatch[1] : "unknown";

            throw new Error(
              `A user with this ${field} already exists`,
              error.code,
            );
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
   * @param near_account_id The NEAR account ID of the user to update
   * @param userData The user data to update
   * @returns The updated user
   * @throws NotFoundError if the user does not exist
   */
  async updateByNearAccountId(near_account_id: string, userData: UpdateUser, txDb: DB) {
    return withErrorHandling(
      async () => {
        const updateResult = await txDb
          .update(schema.users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.near_account_id, near_account_id))
          .returning();

        const updatedUser = updateResult[0];
        if (!updatedUser) {
          throw new Error(`User not found with NEAR account ID: ${near_account_id}`);
        }

        return updatedUser;
      },
      {
        operationName: "update user by NEAR account ID",
        additionalContext: { near_account_id, userData },
      },
    );
  }

  /**
   * Update a user
   * @param auth_provider_id The provider ID of the user to update
   * @param userData The user data to update
   * @returns The updated user
   * @throws NotFoundError if the user does not exist
   */
  async updateUser(auth_provider_id: string, userData: UpdateUser, txDb: DB) {
    return withErrorHandling(
      async () => {
        const updateResult = await txDb
          .update(schema.users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.auth_provider_id, auth_provider_id))
          .returning();

        const updatedUser = updateResult[0];
        if (!updatedUser) {
          throw new Error(`User not found: ${auth_provider_id}`);
        }

        return updatedUser;
      },
      {
        operationName: "update user",
        additionalContext: { auth_provider_id, userData },
      },
    );
  }

  /**
   * Delete a user by their NEAR account ID
   * @param near_account_id The NEAR account ID of the user to delete
   * @returns True if the user was deleted, false otherwise
   */
  async deleteByNearAccountId(near_account_id: string, txDb: DB): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const deleteResult = await txDb
          .delete(schema.users)
          .where(eq(schema.users.near_account_id, near_account_id))
          .returning();

        return deleteResult.length > 0;
      },
      {
        operationName: "delete user by NEAR account ID",
        additionalContext: { near_account_id },
      },
      false,
    );
  }

  /**
   * Delete a user
   * @param auth_provider_id The provider ID of the user to delete
   * @returns True if the user was deleted, false otherwise
   */
  async deleteUser(auth_provider_id: string, txDb: DB): Promise<boolean> {
    return withErrorHandling(
      async () => {
        const deleteResult = await txDb
          .delete(schema.users)
          .where(eq(schema.users.auth_provider_id, auth_provider_id))
          .returning();

        return deleteResult.length > 0;
      },
      {
        operationName: "delete user",
        additionalContext: { auth_provider_id },
      },
      false,
    );
  }
}
