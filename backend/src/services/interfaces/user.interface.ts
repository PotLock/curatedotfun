import { InsertUser, UpdateUser } from "services/db/types";

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
  createUser(data: InsertUser): Promise<any>;

  /**
   * Update an existing user
   * @param auth_provider_id The auth provider ID of the user to update
   * @param data The user data to update
   * @returns The updated user or null if not found
   */
  updateUser(
    data: UpdateUser,
  ): Promise<any | null>;

  /**
   * Delete a user and their associated NEAR account
   * @param auth_provider_id The auth provider ID of the user to delete
   * @returns True if the user and NEAR account were deleted, false otherwise
   */
  deleteUser(auth_provider_id: string): Promise<boolean>;
}
