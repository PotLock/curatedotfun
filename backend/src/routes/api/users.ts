import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import * as schema from "../../services/db/schema";
import { eq } from "drizzle-orm";
import { connect, KeyPair, keyStores, transactions, utils } from "near-api-js";
import { jwt } from "hono/jwt";
import { Env } from "types/app";

const baseUserSchema = createInsertSchema(schema.users, {
  id: undefined,
  createdAt: undefined,
  updatedAt: undefined,
});

// Create a custom schema for user creation
const userCreateSchema = z.object({
  chosen_username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-z0-9]+$/, "Username must be alphanumeric lowercase"),
  near_public_key: z.string(),
  user_info: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

const users = new Hono<Env>();


// TODO: Move to middleware, should protect all routes
const authMiddleware = jwt({
  secret: process.env.JWT_SECRET!,
  cookie: "curatedotfun:auth-token",
});

users.use("*", async (c, next) => {
  await authMiddleware(c, async () => {});

  const payload = c.get("jwtPayload");

  if (payload) {
    c.set("jwtPayload", payload);
  }

  await next();
});

// --- GET /api/users/me ---
// Fetches the profile of the currently authenticated user
users.get("/me", async (c) => {
  const jwtPayload = c.get("jwtPayload"); // TODO: hono zod validator
  const sub_id = jwtPayload?.sub;

  if (!sub_id) {
    return c.json(
      { error: "Unauthorized: Missing user identifier in token" },
      401,
    );
  }

  try {
    const db = c.var.db.getReadDb();
    const userResult = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.sub_id, sub_id))
      .limit(1);

    const user = userResult[0];

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});

// --- POST /api/users ---
// Creates a new user profile and associated NEAR sub-account
users.post("/", zValidator("json", userCreateSchema), async (c) => {
  const { chosen_username, near_public_key, user_info } = c.req.valid("json");
  const jwtPayload = c.get("jwtPayload");
  const sub_id = jwtPayload?.sub;

  if (!sub_id) {
    return c.json(
      { error: "Unauthorized: Missing user identifier in token" },
      401,
    );
  }

  try {
    // Optional: Check if user with sub_id already exists (should be handled by frontend flow ideally)
    // const existingUser = await db.select()... // Placeholder

    // TODO: Add check against reserved names if necessary

    const new_near_account_id = `${chosen_username}.users.curatedotfun.near`; // Or use config for parent domain (app config)

    let nearCreationSuccess = false;
    try {
      // Get the parent account ID and private key from environment variables
      const parentAccountId =
        process.env.NEAR_PARENT_ACCOUNT_ID || "users.curatedotfun.near";
      const parentPrivateKey = process.env.USERS_MASTER_KEYPAIR;

      if (!parentPrivateKey) {
        throw new Error("Missing USERS_MASTER_KEYPAIR environment variable");
      }

      // Determine network (testnet or mainnet)
      const networkId = process.env.NEAR_NETWORK_ID || "testnet";

      // Set up keystore with parent account key
      const keyStore = new keyStores.InMemoryKeyStore();
      // Parse the private key correctly based on its format
      const parentKeyPair = KeyPair.fromString(parentPrivateKey as any); // Type assertion to bypass TS error
      await keyStore.setKey(networkId, parentAccountId, parentKeyPair);

      // Connect to NEAR
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

      // Parse the public key from the string provided by the frontend
      const publicKey = utils.PublicKey.fromString(near_public_key);

      // Create the new account as a sub-account
      const actions = [
        transactions.createAccount(),
        transactions.transfer(BigInt("100000000000000000000000")), // 0.1 NEAR for initial balance (TODO: use utils)
        transactions.addKey(
          publicKey,
          transactions.functionCallAccessKey(
            new_near_account_id,
            [],
            BigInt("1000000000000000000000000"),
          ),
        ),
      ];

      // Execute the transaction
      const result = await parentAccount.signAndSendTransaction({
        receiverId: new_near_account_id,
        actions,
      });

      console.log(`Created NEAR account ${new_near_account_id}`, result);
      nearCreationSuccess = true;
    } catch (nearError: any) {
      console.error("Error creating NEAR account:", nearError);

      // Handle specific NEAR errors
      if (nearError.message?.includes("already exists")) {
        return c.json({ error: "NEAR account name already taken" }, 409);
      } else if (nearError.message?.includes("invalid public key")) {
        return c.json({ error: "Invalid NEAR public key format" }, 400);
      }

      return c.json(
        {
          error: "Failed to create NEAR account",
          details: nearError.message || "Unknown NEAR error",
        },
        500,
      );
    }

    if (!nearCreationSuccess) {
      return c.json({ error: "Failed to create NEAR account" }, 500);
    }

    // 6. Insert user into database
    const db = c.var.db.getWriteDb(); // Use the write connection for inserts

    const insertResult = await db
      .insert(schema.users)
      .values({
        sub_id: sub_id,
        near_account_id: new_near_account_id,
        near_public_key: near_public_key,
        username: user_info?.name || chosen_username, // Use chosen_username as fallback display name
        email: user_info?.email, // Store email if available
      })
      .returning(); // Get the newly inserted user data

    const newUser = insertResult[0]; // Drizzle returns an array

    if (!newUser) {
      // This case should ideally not happen if insert is successful without errors, but good practice
      console.error(
        "Failed to insert user into database after successful NEAR creation.",
      );
      return c.json(
        { error: "Failed to save user profile after account creation" },
        500,
      );
    }

    return c.json({ profile: newUser }, 201);
  } catch (error: any) {
    console.error("Error creating user profile:", error);
    // TODO: Handle potential duplicate key errors from DB (e.g., near_account_id unique constraint)
    // Check for specific database error codes if needed (e.g., PostgreSQL unique violation code '23505')
    if (error?.code === "23505") {
      // Determine which constraint was violated if possible (check error.constraint)
      // Example: if (error.constraint === 'users_near_account_id_idx') ...
      return c.json(
        {
          error: "A user with this NEAR account or identifier already exists.",
        },
        409,
      ); // Conflict
    }
    return c.json({ error: "Failed to create user profile" }, 500);
  }
});

// Create a schema for user profile updates
const userUpdateSchema = z.object({
  username: z.string().optional(),
  email: z.string().email().optional(),
});

// --- PUT /api/users/me ---
// Updates the profile of the currently authenticated user
users.put("/me", zValidator("json", userUpdateSchema), async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const sub_id = jwtPayload?.sub;
  const updateData = c.req.valid("json");

  if (!sub_id) {
    return c.json(
      { error: "Unauthorized: Missing user identifier in token" },
      401,
    );
  }

  try {
    const db = c.var.db.getWriteDb();

    // Update the user profile
    const updateResult = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.sub_id, sub_id))
      .returning();

    const updatedUser = updateResult[0];

    if (!updatedUser) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile: updatedUser });
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return c.json({ error: "Failed to update user profile" }, 500);
  }
});

export default users;
