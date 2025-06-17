import {
  InsertUser,
  selectUserSchema,
  UpdateUser,
  UserRepository,
  type DB,
  type PlatformIdentity,
} from "@curatedotfun/shared-db";
import { NearIntegrationConfig } from "@curatedotfun/types";
import {
  NearAccountError,
  NotFoundError,
  UserServiceError,
} from "@curatedotfun/utils";
import { connect, KeyPair, keyStores, transactions } from "near-api-js";
import { KeyPairString } from "near-api-js/lib/utils";
import { Logger } from "pino";
import { PlatformIdentityPayload } from "../routes/api/users";
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

  async findUserByAuthProviderId(auth_provider_id: string) {
    const user =
      await this.userRepository.findByAuthProviderId(auth_provider_id);

    if (!user) {
      return null;
    }

    return selectUserSchema.parse(user);
  }

  async findUserByNearAccountId(nearAccountId: string) {
    const user = await this.userRepository.findByNearAccountId(nearAccountId);
    if (!user) {
      return null;
    }
    return selectUserSchema.parse(user);
  }

  async createUser(data: InsertUser) {
    const {
      auth_provider_id,
      username,
      near_account_id,
      near_public_key,
      email,
    } = data;

    try {
      // The actual database user creation is now wrapped in a transaction
      const newUser = await this.db.transaction(async (tx) => {
        return this.userRepository.createUser(
          {
            auth_provider_id,
            near_account_id,
            near_public_key,
            username,
            email,
          },
          tx,
        );
      });

      if (!newUser) {
        // Should not happen if createUser is expected to return a user or throw
        throw new UserServiceError("Failed to create user record", 500);
      }

      return selectUserSchema.parse(newUser);
    } catch (error: any) {
      // If the error is already a UserServiceError or NearAccountError, rethrow it
      if (
        error instanceof UserServiceError ||
        error instanceof NearAccountError
      ) {
        throw error;
      }
      console.error("Error inserting user into database:", error);
      throw new UserServiceError(
        error.message || "Failed to save user profile",
        error.statusCode || 500,
        error,
      );
    }
  }

  async updateUserByNearAccountId(nearAccountId: string, data: UpdateUser) {
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
      return selectUserSchema.parse(updatedUser);
    } catch (error: any) {
      if (error instanceof UserServiceError || error instanceof NotFoundError) {
        throw error;
      }
      if (error.message?.startsWith("User not found with NEAR account ID:")) {
        throw new NotFoundError("User", nearAccountId);
      }
      console.error(
        `Error updating user by NEAR account ID ${nearAccountId}:`,
        error,
      );
      throw new UserServiceError(
        error.message || "Failed to update user profile",
        error.statusCode || 500,
        error,
      );
    }
  }

  async updateUser(auth_provider_id: string, data: UpdateUser) {
    try {
      const updatedUser = await this.db.transaction(async (tx) => {
        return this.userRepository.updateUser(auth_provider_id, data, tx);
      });

      if (!updatedUser) {
        return null;
      }

      return selectUserSchema.parse(updatedUser);
    } catch (error: any) {
      if (error instanceof UserServiceError || error instanceof NotFoundError) {
        throw error;
      }
      console.error("Error updating user:", error);
      throw new UserServiceError(
        error.message || "Failed to update user profile",
        error.statusCode || 500,
        error,
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

    if (!user || !user.near_account_id) {
      throw new NotFoundError("User", nearAccountIdToDelete);
    }

    const { near_account_id } = user;
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

      console.log(
        `Attempting to delete NEAR account: ${near_account_id} with beneficiary ${parentAccountId}`,
      );

      const actions = [transactions.deleteAccount(parentAccountId)];

      await parentAccount.signAndSendTransaction({
        receiverId: near_account_id,
        actions,
      });

      console.log(`Successfully deleted NEAR account: ${near_account_id}`);
    } catch (nearError: any) {
      console.error(
        `Error deleting NEAR account ${near_account_id}:`,
        nearError,
      );
      if (
        nearError.message?.includes("Account ID #") &&
        nearError.message?.includes("doesn't exist")
      ) {
        console.warn(
          `NEAR account ${near_account_id} might have been already deleted or never existed. Proceeding with DB deletion.`,
        );
      } else {
        throw new NearAccountError(
          `Failed to delete NEAR account ${near_account_id}`,
          500,
          nearError,
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
        console.log(
          `Successfully deleted user from database (near_account_id: ${nearAccountIdToDelete})`,
        );
      } else {
        console.warn(
          `User (near_account_id: ${nearAccountIdToDelete}) was not found in the database for deletion, or was already deleted.`,
        );
      }
      return true;
    } catch (error: any) {
      if (
        error instanceof UserServiceError ||
        error instanceof NotFoundError ||
        error instanceof NearAccountError
      ) {
        throw error;
      }
      console.error(
        `Error deleting user (near_account_id: ${nearAccountIdToDelete}) from database:`,
        error,
      );
      throw new UserServiceError(
        error.message || "Failed to delete user from database",
        error.statusCode || 500,
        error,
      );
    }
  }

  async updateUserPlatformIdentities(
    nearAccountId: string,
    identities: PlatformIdentityPayload[],
  ): Promise<void> {
    this.logger.info(
      { nearAccountId, identitiesCount: identities.length },
      "Attempting to update user platform identities",
    );

    const user = await this.userRepository.findByNearAccountId(nearAccountId);
    if (!user || !user.id) {
      this.logger.warn(
        { nearAccountId },
        "User not found for updating platform identities",
      );
      throw new NotFoundError("User", nearAccountId);
    }

    // Map incoming payload to the DB schema's PlatformIdentity type
    const dbPlatformIdentities: PlatformIdentity[] = identities.map(
      (identity) => ({
        platform: identity.platformName,
        id: identity.platformUserId,
        username: identity.username,
        profileImage: identity.profileImageUrl,
      }),
    );

    try {
      const updatedUser = await this.db.transaction(async (tx) => {
        return this.userRepository.updateByNearAccountId(
          nearAccountId,
          { platform_identities: dbPlatformIdentities },
          tx, // Pass the transaction object
        );
      });

      if (!updatedUser) {
        // This case should ideally be handled by userRepository.updateByNearAccountId throwing an error if user not found
        this.logger.error(
          { nearAccountId },
          "User update returned no result, implies user not found during update.",
        );
        throw new NotFoundError("User", nearAccountId);
      }

      this.logger.info(
        { nearAccountId, userId: updatedUser.id },
        "Successfully updated user platform identities.",
      );
    } catch (error: any) {
      this.logger.error(
        { nearAccountId, error: error.message, stack: error.stack },
        "Error updating platform identities in transaction",
      );
      throw new UserServiceError(
        `Failed to update platform identities for ${nearAccountId}: ${error.message}`,
        500,
        error,
      );
    }
  }

  async deleteUser(auth_provider_id: string): Promise<boolean> {
    const user =
      await this.userRepository.findByAuthProviderId(auth_provider_id);

    if (!user || !user.near_account_id) {
      throw new NotFoundError("User", auth_provider_id);
    }

    const { near_account_id } = user;
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

      console.log(
        `Attempting to delete NEAR account: ${near_account_id} with beneficiary ${parentAccountId}`,
      );

      const actions = [transactions.deleteAccount(parentAccountId)];

      await parentAccount.signAndSendTransaction({
        receiverId: near_account_id,
        actions,
      });

      console.log(`Successfully deleted NEAR account: ${near_account_id}`);
    } catch (nearError: any) {
      console.error(
        `Error deleting NEAR account ${near_account_id}:`,
        nearError,
      );
      if (
        nearError.message?.includes("Account ID #") &&
        nearError.message?.includes("doesn't exist")
      ) {
        console.warn(
          `NEAR account ${near_account_id} might have been already deleted or never existed. Proceeding with DB deletion.`,
        );
      } else {
        throw new NearAccountError(
          `Failed to delete NEAR account ${near_account_id}`,
          500,
          nearError,
        );
      }
    }

    try {
      const dbDeletionResult = await this.db.transaction(async (tx) => {
        return this.userRepository.deleteUser(auth_provider_id, tx);
      });

      if (dbDeletionResult) {
        console.log(
          `Successfully deleted user from database: ${auth_provider_id}`,
        );
      } else {
        console.warn(
          `User ${auth_provider_id} was not found in the database for deletion, or was already deleted during the transaction.`,
        );
      }
      return true;
    } catch (error: any) {
      if (
        error instanceof UserServiceError ||
        error instanceof NotFoundError ||
        error instanceof NearAccountError
      ) {
        throw error;
      }
      console.error(
        `Error deleting user ${auth_provider_id} from database:`,
        error,
      );
      throw new UserServiceError(
        error.message || "Failed to delete user from database",
        error.statusCode || 500,
        error,
      );
    }
  }
}
