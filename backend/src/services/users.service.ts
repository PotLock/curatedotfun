import { connect, KeyPair, keyStores, transactions, utils } from "near-api-js";
import { KeyPairString } from "near-api-js/lib/utils";
import { Logger } from "pino";
import {
  NearAccountError,
  NotFoundError,
  UserServiceError,
} from "../types/errors";
import { NearIntegrationConfig } from "../types/config.zod";
import { selectUserSchema } from "../validation/users.validation";
import { UserRepository } from "./db/repositories/user.repository";
import { DB, InsertUser, UpdateUser } from "./db/types";
import { IUserService } from "./interfaces/user.interface";

export class UserService implements IUserService {
  constructor(
    private userRepository: UserRepository,
    private db: DB,
    private logger: Logger,
    private nearConfig: NearIntegrationConfig,
  ) {}

  async findUserByAuthProviderId(auth_provider_id: string) {
    const user =
      await this.userRepository.findByAuthProviderId(auth_provider_id);

    if (!user) {
      return null;
    }

    return selectUserSchema.parse(user);
  }

  async createUser(data: InsertUser) {
    const { auth_provider_id, username, near_public_key, email } = data;
    const parentAccountId = this.nearConfig.parentAccountId;
    const new_near_account_id = `${username}.${parentAccountId}`;

    try {
      const parentPrivateKey = this.nearConfig.parentKeyPair;

      if (!parentPrivateKey) {
        throw new NearAccountError(
          "Missing parentKeyPair in NEAR integration config",
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
        nodeUrl: this.nearConfig.nodeUrl || `https://rpc.${networkId}.near.org`,
        walletUrl:
          this.nearConfig.walletUrl || `https://wallet.${networkId}.near.org`,
        helperUrl:
          this.nearConfig.helperUrl || `https://helper.${networkId}.near.org`,
        explorerUrl:
          this.nearConfig.explorerUrl ||
          `https://explorer.${networkId}.near.org`,
      };

      const nearConnection = await connect(connectionConfig);
      const parentAccount = await nearConnection.account(parentAccountId);
      const publicKey = utils.PublicKey.fromString(near_public_key);

      const actions = [
        transactions.createAccount(),
        transactions.transfer(BigInt("100000000000000000000000")),
        transactions.addKey(
          publicKey,
          transactions.functionCallAccessKey(
            new_near_account_id,
            [],
            BigInt("1000000000000000000000000"),
          ),
        ),
      ];

      await parentAccount.signAndSendTransaction({
        receiverId: new_near_account_id,
        actions,
      });

      console.log(`Created NEAR account ${new_near_account_id}`);
    } catch (nearError: any) {
      console.error("Error creating NEAR account:", nearError);
      if (nearError.message?.includes("already exists")) {
        throw new NearAccountError(
          "NEAR account name already taken",
          409,
          nearError,
        );
      } else if (nearError.message?.includes("invalid public key")) {
        throw new NearAccountError(
          "Invalid NEAR public key format",
          400,
          nearError,
        );
      }
      throw new NearAccountError(
        "Failed to create NEAR account",
        500,
        nearError,
      );
    }

    try {
      // The actual database user creation is now wrapped in a transaction
      const newUser = await this.db.transaction(async (tx) => {
        return this.userRepository.createUser(
          {
            auth_provider_id,
            near_account_id: new_near_account_id,
            near_public_key,
            username,
            email,
          },
          tx, // Pass the transactional DB instance
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

  async updateUser(auth_provider_id: string, data: UpdateUser) {
    try {
      const updatedUser = await this.db.transaction(async (tx) => {
        return this.userRepository.updateUser(auth_provider_id, data, tx);
      });

      if (!updatedUser) {
        // If updateUser can return null for "not found", this is fine.
        // Otherwise, if it should always return a user or throw, this might indicate an issue.
        // Assuming repository.updateUser handles "not found" by returning null.
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
        nodeUrl: this.nearConfig.nodeUrl || `https://rpc.${networkId}.near.org`,
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
        // This case implies the repository's deleteUser might return false if user not found.
        console.warn(
          `User ${auth_provider_id} was not found in the database for deletion, or was already deleted during the transaction.`,
        );
      }
      // The overall deleteUser operation is considered successful if NEAR deletion passed (or was skipped)
      // and the DB deletion attempt concluded, even if the user was already gone from DB.
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
