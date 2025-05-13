import { eq } from "drizzle-orm";
import { connect, KeyPair, keyStores, transactions, utils } from "near-api-js";
import { z } from "zod"; // Import z
import {
  insertUserSchema,
  selectUserSchema,
  updateUserSchema,
} from "../validation/users.validation"; // Import more schemas
import { DatabaseConnection } from "./db/connection";
import * as schema from "./db/schema";

export type InsertUserData = z.infer<typeof insertUserSchema> & {
  sub_id: string;
};
export type UpdateUserData = z.infer<typeof updateUserSchema>;

export class UserService {
  constructor(private dbInstance: DatabaseConnection) {}

  async findUserBySubId(sub_id: string) {
    const db = this.dbInstance.getReadDb();

    const userResult = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.sub_id, sub_id))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return null;
    }
    return selectUserSchema.parse(user);
  }

  async createUser(data: InsertUserData) {
    const writeDb = this.dbInstance.getWriteDb();

    const { sub_id, username, near_public_key, email } = data;
    const parentAccountId =
      process.env.NEAR_PARENT_ACCOUNT_ID || "users.curatedotfun.testnet";
    const new_near_account_id = `${username}.${parentAccountId}`;

    try {
      const parentPrivateKey = process.env.USERS_MASTER_KEYPAIR;

      if (!parentPrivateKey) {
        throw new Error("Missing USERS_MASTER_KEYPAIR environment variable");
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
        throw new Error("NEAR account name already taken");
      } else if (nearError.message?.includes("invalid public key")) {
        throw new Error("Invalid NEAR public key format");
      }
      throw new Error("Failed to create NEAR account");
    }

    try {
      const insertResult = await writeDb
        .insert(schema.users)
        .values({
          sub_id: sub_id,
          near_account_id: new_near_account_id,
          near_public_key: near_public_key,
          username: username,
          email: email,
        })
        .returning();

      const newUser = insertResult[0];

      if (!newUser) {
        throw new Error("Failed to insert user into database.");
      }
      return selectUserSchema.parse(newUser);
    } catch (dbError: any) {
      console.error("Error inserting user into database:", dbError);
      if (dbError?.code === "23505") {
        throw new Error(
          "A user with this NEAR account or identifier already exists.",
        );
      }
      throw new Error("Failed to save user profile");
    }
  }

  async updateUser(sub_id: string, data: UpdateUserData) {
    const writeDb = this.dbInstance.getWriteDb();

    const updateResult = await writeDb
      .update(schema.users)
      .set(data)
      .where(eq(schema.users.sub_id, sub_id))
      .returning();

    const updatedUser = updateResult[0];

    if (!updatedUser) {
      return null;
    }
    return selectUserSchema.parse(updatedUser);
  }
}
