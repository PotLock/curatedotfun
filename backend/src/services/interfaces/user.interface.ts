import { z } from "zod";
import { insertUserSchema, updateUserSchema } from "../../validation/users.validation";

export type InsertUserData = z.infer<typeof insertUserSchema> & {
  auth_provider_id: string;
};

export type UpdateUserData = z.infer<typeof updateUserSchema>;

export interface IUserService {
  /**
   * Find a user by their auth provider ID
   * @param auth_provider_id The auth provider ID from Web3Auth
   * @returns The user if found, null otherwise
   */
  findUserByAuthProviderId(auth_provider_id: string): Promise<any | null>;

  /**
   * Create a new user with a NEAR account
   * @param data User data including NEAR public key
   * @returns The created user
   */
  createUser(data: InsertUserData): Promise<any>;

  /**
   * Update an existing user
   * @param auth_provider_id The auth provider ID of the user to update
   * @param data The user data to update
   * @returns The updated user or null if not found
   */
  updateUser(auth_provider_id: string, data: UpdateUserData): Promise<any | null>;
}
