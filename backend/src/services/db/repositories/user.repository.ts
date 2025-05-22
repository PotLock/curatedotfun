import { eq } from "drizzle-orm";
import { DatabaseError, NotFoundError } from "../../../types/errors";
import * as schema from "../schema";
import {
  executeOperation,
  executeTransaction,
  withDatabaseErrorHandling,
} from "../transaction";

export class UserRepository {
  /**
   * Find a user by their auth_provider_id
   * @param auth_provider_id The provider ID from Web3Auth
   * @returns The user if found, null otherwise
   */
  async findByAuthProviderId(auth_provider_id: string) {
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          const result = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.auth_provider_id, auth_provider_id))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        });
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
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          const result = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.near_account_id, near_account_id))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        });
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
    return withDatabaseErrorHandling(
      async () => {
        return executeOperation(async (db) => {
          const result = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.near_public_key, near_public_key))
            .limit(1);

          return result.length > 0 ? result[0] : null;
        });
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
  async createUser(userData: {
    auth_provider_id: string;
    near_account_id: string;
    near_public_key: string;
    username?: string | null;
    email?: string | null;
  }) {
    return withDatabaseErrorHandling(
      async () => {
        return executeTransaction(async (db) => {
          try {
            const insertResult = await db
              .insert(schema.users)
              .values({
                auth_provider_id: userData.auth_provider_id,
                near_account_id: userData.near_account_id,
                near_public_key: userData.near_public_key,
                username: userData.username || null,
                email: userData.email || null,
              })
              .returning();

            const newUser = insertResult[0];
            if (!newUser) {
              throw new DatabaseError("Failed to insert user into database");
            }

            return newUser;
          } catch (error: any) {
            // Handle unique constraint violations
            if (error?.code === "23505") {
              // Extract the constraint name to provide a more specific error message
              const constraintMatch = error.detail?.match(/Key \((.*?)\)=/);
              const field = constraintMatch ? constraintMatch[1] : "unknown";

              throw new DatabaseError(
                `A user with this ${field} already exists`,
                error.code,
                error,
              );
            }
            throw error;
          }
        }, true); // isWrite = true
      },
      {
        operationName: "create user",
        additionalContext: { userData },
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
  async updateUser(
    auth_provider_id: string,
    userData: {
      username?: string | null;
      email?: string | null;
      name?: string | null;
    },
  ) {
    return withDatabaseErrorHandling(
      async () => {
        return executeTransaction(async (db) => {
          const updateResult = await db
            .update(schema.users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(schema.users.auth_provider_id, auth_provider_id))
            .returning();

          const updatedUser = updateResult[0];
          if (!updatedUser) {
            throw new NotFoundError("User", auth_provider_id);
          }

          return updatedUser;
        }, true); // isWrite = true
      },
      {
        operationName: "update user",
        additionalContext: { auth_provider_id, userData },
      },
    );
  }

  /**
   * Delete a user
   * @param auth_provider_id The provider ID of the user to delete
   * @returns True if the user was deleted, false otherwise
   */
  async deleteUser(auth_provider_id: string) {
    return withDatabaseErrorHandling(
      async () => {
        return executeTransaction(async (db) => {
          const deleteResult = await db
            .delete(schema.users)
            .where(eq(schema.users.auth_provider_id, auth_provider_id))
            .returning();

          return deleteResult.length > 0;
        }, true); // isWrite = true
      },
      {
        operationName: "delete user",
        additionalContext: { auth_provider_id },
      },
      false,
    );
  }
}

export const userRepository = new UserRepository();
