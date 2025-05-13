import { connect, KeyPair, keyStores, transactions, utils } from "near-api-js";
import { selectUserSchema } from "../validation/users.validation";
import { DatabaseConnection } from "./db/connection";
import { userRepository } from "./db/repositories";
import { IUserService, InsertUserData, UpdateUserData } from "./interfaces/user.interface";
import { NearAccountError, UserServiceError } from "../types/errors";

export type { InsertUserData, UpdateUserData } from "./interfaces/user.interface";

export class UserService implements IUserService {
  private userRepository = userRepository;

  constructor(private dbInstance: DatabaseConnection) {}

  async findUserByAuthProviderId(auth_provider_id: string) {
    const user = await this.userRepository.findByAuthProviderId(auth_provider_id);
    
    if (!user) {
      return null;
    }
    
    return selectUserSchema.parse(user);
  }

  async createUser(data: InsertUserData) {
    const { auth_provider_id, username, near_public_key, email } = data;
    const parentAccountId =
      process.env.NEAR_PARENT_ACCOUNT_ID || "users.curatedotfun.testnet";
    const new_near_account_id = `${username}.${parentAccountId}`;

    try {
      const parentPrivateKey = process.env.USERS_MASTER_KEYPAIR;

      if (!parentPrivateKey) {
        throw new NearAccountError("Missing USERS_MASTER_KEYPAIR environment variable");
      }

      const networkId = process.env.NEAR_NETWORK_ID || "testnet";

      const keyStore = new keyStores.InMemoryKeyStore();
      const parentKeyPair = KeyPair.fromString(parentPrivateKey as any);
      await keyStore.setKey(networkId, parentAccountId, parentKeyPair);

      const connectionConfig = {
        networkId,
        keyStore,
        nodeUrl: `https://rpc.${networkId}.near.org`,
        walletUrl: `https://wallet.${networkId}.near.org`,
        helperUrl: `https://helper.${networkId}.near.org`,
        explorerUrl: `https://explorer.${networkId}.near.org`,
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
        throw new NearAccountError("NEAR account name already taken", 409, nearError);
      } else if (nearError.message?.includes("invalid public key")) {
        throw new NearAccountError("Invalid NEAR public key format", 400, nearError);
      }
      throw new NearAccountError("Failed to create NEAR account", 500, nearError);
    }

    try {
      const newUser = await this.userRepository.createUser({
        auth_provider_id,
        near_account_id: new_near_account_id,
        near_public_key,
        username,
        email,
      });

      return selectUserSchema.parse(newUser);
    } catch (error: any) {
      console.error("Error inserting user into database:", error);
      throw new UserServiceError(
        error.message || "Failed to save user profile",
        error.statusCode || 500,
        error
      );
    }
  }

  async updateUser(auth_provider_id: string, data: UpdateUserData) {
    try {
      const updatedUser = await this.userRepository.updateUser(auth_provider_id, data);
      
      if (!updatedUser) {
        return null;
      }
      
      return selectUserSchema.parse(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      throw new UserServiceError(
        error.message || "Failed to update user profile",
        error.statusCode || 500,
        error
      );
    }
  }
}
