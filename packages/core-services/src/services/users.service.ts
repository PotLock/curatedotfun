import {
  selectUserSchema,
  UserRepository,
  type DB,
} from "@curatedotfun/shared-db";
import {
  CreateUserRequest,
  NearIntegrationConfig,
  UpdateUserRequest,
  UserProfile,
  UserProfileSchema,
} from "@curatedotfun/types";
import {
  NearAccountError,
  NotFoundError,
  UserServiceError,
} from "@curatedotfun/utils";
import { connect, KeyPair, keyStores, transactions } from "near-api-js";
import type { KeyPairString } from "near-api-js/lib/utils/key_pair";
import { Logger } from "pino";
import { IBaseService } from "./interfaces/base-service.interface";

export class UserService implements IBaseService {
  public readonly logger: Logger;

  constructor(
    private userRepository: UserRepository,
    private db: DB,
    private nearConfig: NearIntegrationConfig,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async findUserByAuthProviderId(
    authProviderId: string,
  ): Promise<UserProfile | null> {
    const user = await this.userRepository.findByAuthProviderId(authProviderId);

    if (!user) {
      return null;
    }

    const parsedUser = selectUserSchema.parse(user);
    return UserProfileSchema.parse(parsedUser);
  }

  async ensureUserProfile(nearAccountId: string): Promise<UserProfile> {
    const existingUser = await this.findUserByNearAccountId(nearAccountId);
    if (existingUser) {
      return existingUser;
    }

    const newUser = await this.createUser({ nearAccountId });
    return newUser;
  }

  /**
   * Find a user by NEAR account ID and return as API UserProfile
   */
  async findUserByNearAccountId(
    nearAccountId: string,
  ): Promise<UserProfile | null> {
    const user = await this.userRepository.findByNearAccountId(nearAccountId);
    if (!user) {
      return null;
    }
    const parsedUser = selectUserSchema.parse(user);
    return UserProfileSchema.parse(parsedUser);
  }

  /**
   * Create a user from API request data
   */
  async createUser(data: CreateUserRequest): Promise<UserProfile> {
    try {
      // The actual database user creation is now wrapped in a transaction
      const newUser = await this.db.transaction(async (tx) => {
        return this.userRepository.createUser(data, tx);
      });

      if (!newUser) {
        // Should not happen if createUser is expected to return a user or throw
        throw new UserServiceError("Failed to create user record", 500);
      }

      const parsedUser = selectUserSchema.parse(newUser);
      return UserProfileSchema.parse(parsedUser);
    } catch (error: unknown) {
      // If the error is already a UserServiceError or NearAccountError, rethrow it
      if (
        error instanceof UserServiceError ||
        error instanceof NearAccountError
      ) {
        throw error;
      }
      this.logger.error({ error }, "Error inserting user into database");
      throw new UserServiceError(
        (error as Error).message || "Failed to save user profile",
        (error as any).statusCode || 500,
        { cause: error as Error },
      );
    }
  }

  /**
   * Update a user by NEAR account ID
   */
  async updateUserByNearAccountId(
    nearAccountId: string,
    data: UpdateUserRequest,
  ): Promise<UserProfile | null> {
    try {
      const updatedUser = await this.db.transaction(async (tx) => {
        return this.userRepository.updateByNearAccountId(
          nearAccountId,
          data,
          tx,
        );
      });

      if (!updatedUser) {
        return null;
      }
      const parsedUser = selectUserSchema.parse(updatedUser);
      return UserProfileSchema.parse(parsedUser);
    } catch (error: unknown) {
      if (error instanceof UserServiceError || error instanceof NotFoundError) {
        throw error;
      }
      if (
        (error as Error).message?.startsWith(
          "User not found with NEAR account ID:",
        )
      ) {
        throw new NotFoundError("User", nearAccountId);
      }
      this.logger.error(
        { error },
        `Error updating user by NEAR account ID ${nearAccountId}`,
      );
      throw new UserServiceError(
        (error as Error).message || "Failed to update user profile",
        (error as any).statusCode || 500,
        { cause: error as Error },
      );
    }
  }

  async updateUser(
    authProviderId: string,
    data: UpdateUserRequest,
  ): Promise<UserProfile | null> {
    try {
      const updatedUser = await this.db.transaction(async (tx) => {
        return this.userRepository.updateUser(authProviderId, data, tx);
      });

      if (!updatedUser) {
        return null;
      }

      const parsedUser = selectUserSchema.parse(updatedUser);
      return UserProfileSchema.parse(parsedUser);
    } catch (error: unknown) {
      if (error instanceof UserServiceError || error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error({ error }, "Error updating user");
      throw new UserServiceError(
        (error as Error).message || "Failed to update user profile",
        (error as any).statusCode || 500,
        { cause: error as Error },
      );
    }
  }

  async deleteUserByNearAccountId(
    nearAccountIdToDelete: string,
  ): Promise<boolean> {
    // First, ensure the user exists to get their full details for NEAR account deletion part.
    const user = await this.userRepository.findByNearAccountId(
      nearAccountIdToDelete,
    );

    if (!user || !user.nearAccountId) {
      throw new NotFoundError("User", nearAccountIdToDelete);
    }

    const { nearAccountId } = user;
    const parentAccountId = this.nearConfig.parentAccountId;

    try {
      const parentPrivateKey = this.nearConfig.parentKeyPair;
      if (!parentPrivateKey) {
        throw new NearAccountError(
          "Missing parentKeyPair in NEAR integration config for account deletion",
        );
      }

      const networkId = this.nearConfig.networkId;
      const keyStore = new keyStores.InMemoryKeyStore();
      const parentKeyPair = KeyPair.fromString(
        parentPrivateKey as KeyPairString,
      );
      await keyStore.setKey(networkId, parentAccountId, parentKeyPair);

      const connectionConfig = {
        networkId,
        keyStore,
        nodeUrl: this.nearConfig.rpcUrl || `https://rpc.${networkId}.near.org`,
      };

      const nearConnection = await connect(connectionConfig);
      const parentAccount = await nearConnection.account(parentAccountId);

      this.logger.info(
        `Attempting to delete NEAR account: ${nearAccountId} with beneficiary ${parentAccountId}`,
      );

      const actions = [transactions.deleteAccount(parentAccountId)];

      await parentAccount.signAndSendTransaction({
        receiverId: nearAccountId,
        actions,
      });

      this.logger.info(`Successfully deleted NEAR account: ${nearAccountId}`);
    } catch (nearError: unknown) {
      this.logger.error(
        { error: nearError },
        `Error deleting NEAR account ${nearAccountId}`,
      );
      if (
        (nearError as Error).message?.includes("Account ID #") &&
        (nearError as Error).message?.includes("doesn't exist")
      ) {
        this.logger.warn(
          `NEAR account ${nearAccountId} might have been already deleted or never existed. Proceeding with DB deletion.`,
        );
      } else {
        throw new NearAccountError(
          `Failed to delete NEAR account ${nearAccountId}`,
          500,
          {
            cause:
              nearError instanceof Error
                ? nearError
                : new Error(String(nearError)),
          },
        );
      }
    }

    try {
      const dbDeletionResult = await this.db.transaction(async (tx) => {
        return this.userRepository.deleteByNearAccountId(
          nearAccountIdToDelete,
          tx,
        );
      });

      if (dbDeletionResult) {
        this.logger.info(
          `Successfully deleted user from database (nearAccountId: ${nearAccountIdToDelete})`,
        );
      } else {
        this.logger.warn(
          `User (nearAccountId: ${nearAccountIdToDelete}) was not found in the database for deletion, or was already deleted.`,
        );
      }
      return true;
    } catch (error: unknown) {
      if (
        error instanceof UserServiceError ||
        error instanceof NotFoundError ||
        error instanceof NearAccountError
      ) {
        throw error;
      }
      this.logger.error(
        { error },
        `Error deleting user (nearAccountId: ${nearAccountIdToDelete}) from database`,
      );
      throw new UserServiceError(
        (error as Error).message || "Failed to delete user from database",
        (error as any).statusCode || 500,
        { cause: error as Error },
      );
    }
  }

  async deleteUser(authProviderId: string): Promise<boolean> {
    const user = await this.userRepository.findByAuthProviderId(authProviderId);

    if (!user || !user.nearAccountId) {
      throw new NotFoundError("User", authProviderId);
    }

    const { nearAccountId } = user;
    const parentAccountId = this.nearConfig.parentAccountId;

    try {
      const parentPrivateKey = this.nearConfig.parentKeyPair;
      if (!parentPrivateKey) {
        throw new NearAccountError(
          "Missing parentKeyPair in NEAR integration config for account deletion",
        );
      }

      const networkId = this.nearConfig.networkId;
      const keyStore = new keyStores.InMemoryKeyStore();
      const parentKeyPair = KeyPair.fromString(
        parentPrivateKey as KeyPairString,
      );
      await keyStore.setKey(networkId, parentAccountId, parentKeyPair);

      const connectionConfig = {
        networkId,
        keyStore,
        nodeUrl: this.nearConfig.rpcUrl || `https://rpc.${networkId}.near.org`,
      };

      const nearConnection = await connect(connectionConfig);
      const parentAccount = await nearConnection.account(parentAccountId);

      this.logger.info(
        `Attempting to delete NEAR account: ${nearAccountId} with beneficiary ${parentAccountId}`,
      );

      const actions = [transactions.deleteAccount(parentAccountId)];

      await parentAccount.signAndSendTransaction({
        receiverId: nearAccountId,
        actions,
      });

      this.logger.info(`Successfully deleted NEAR account: ${nearAccountId}`);
    } catch (nearError: unknown) {
      this.logger.error(
        { error: nearError },
        `Error deleting NEAR account ${nearAccountId}`,
      );
      if (
        (nearError as Error).message?.includes("Account ID #") &&
        (nearError as Error).message?.includes("doesn't exist")
      ) {
        this.logger.warn(
          `NEAR account ${nearAccountId} might have been already deleted or never existed. Proceeding with DB deletion.`,
        );
      } else {
        throw new NearAccountError(
          `Failed to delete NEAR account ${nearAccountId}`,
          500,
          {
            cause:
              nearError instanceof Error
                ? nearError
                : new Error(String(nearError)),
          },
        );
      }
    }

    try {
      const dbDeletionResult = await this.db.transaction(async (tx) => {
        return this.userRepository.deleteUser(authProviderId, tx);
      });

      if (dbDeletionResult) {
        this.logger.info(
          `Successfully deleted user from database: ${authProviderId}`,
        );
      } else {
        this.logger.warn(
          `User ${authProviderId} was not found in the database for deletion, or was already deleted during the transaction.`,
        );
      }
      return true;
    } catch (error: unknown) {
      if (
        error instanceof UserServiceError ||
        error instanceof NotFoundError ||
        error instanceof NearAccountError
      ) {
        throw error;
      }
      this.logger.error(
        { error },
        `Error deleting user ${authProviderId} from database`,
      );
      throw new UserServiceError(
        (error as Error).message || "Failed to delete user from database",
        (error as any).statusCode || 500,
        { cause: error as Error },
      );
    }
  }
}
