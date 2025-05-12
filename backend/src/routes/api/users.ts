import { Hono } from "hono";
import { validator } from "hono/validator";
import { getDatabase } from "../../services/db";
import * as schema from "../../services/db/schema";
import { eq } from "drizzle-orm";
// import { connect, KeyPair, keyStores, transactions, utils } from "near-api-js"; // Requires installation
// TODO: Import necessary types (e.g., User from schema, Web3Auth user info type)
// TODO: Import authentication middleware

const users = new Hono();

// --- Middleware (Placeholder) ---
// Apply authentication middleware to protect these routes
// users.use('*', authMiddleware); // Example placeholder

// --- GET /api/users/me ---
// Fetches the profile of the currently authenticated user
users.get("/me", async (c) => {
  // 1. Get sub_id from authenticated context (e.g., c.get('jwtPayload').sub)
  // const sub_id = c.get("sub_id_from_auth_middleware"); // Placeholder - Requires Auth Middleware
  const sub_id = "placeholder_sub_id"; // Temporary placeholder value

  if (!sub_id) {
    // This check might be redundant now but keep for structure
    return c.json({ error: "Unauthorized: Missing user identifier" }, 401);
  }

  try {
    // 2. Query database for user by sub_id
    const dbInstance = getDatabase();
    const db = dbInstance.getReadDb(); // Use the read connection
    const userResult = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.sub_id, sub_id))
      .limit(1);

    const user = userResult[0]; // Drizzle returns an array, get the first element if it exists

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    // 3. Return user profile
    return c.json({ profile: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});

// --- POST /api/users ---
// Creates a new user profile and associated NEAR sub-account
users.post(
  "/",
  // Input validation
  validator("json", (value, c) => {
    // TODO: Define expected schema using Zod or similar
    const expectedSchema = {
      chosen_username: "string", // Add more specific validation (length, chars)
      near_public_key: "string", // Add specific validation (format)
      user_info: "object?", // Optional
    };
    // Basic type check placeholder
    if (
      typeof value?.chosen_username !== "string" ||
      typeof value?.near_public_key !== "string"
    ) {
      return c.json({ error: "Invalid input" }, 400);
    }
    return value; // Return validated value
  }),
  async (c) => {
    const { chosen_username, near_public_key, user_info } = c.req.valid("json");
    // 1. Get sub_id from authenticated context
    // const sub_id = c.get("sub_id_from_auth_middleware"); // Placeholder - Requires Auth Middleware
    const sub_id = "placeholder_sub_id"; // Temporary placeholder value

    if (!sub_id) {
      // This check might be redundant now but keep for structure
      return c.json({ error: "Unauthorized: Missing user identifier" }, 401);
    }

    try {
      // 2. Optional: Check if user with sub_id already exists (should be handled by frontend flow ideally)
      // const existingUser = await db.select()... // Placeholder

      // 3. Validate chosen_username format (more specific checks)
      if (!/^[a-z0-9]+$/.test(chosen_username) || chosen_username.length < 2 || chosen_username.length > 32) {
         return c.json({ error: "Invalid username format or length" }, 400);
      }
      // TODO: Add check against reserved names if necessary

      // 4. Construct full NEAR account ID
      const new_near_account_id = `${chosen_username}.users.curatedotfun.near`; // Or use config for parent domain

      // 5. TODO: Implement NEAR sub-account creation logic
      //    - Connect to NEAR using parent account key
      //    - Call createAccount and addKey actions
      //    - Handle errors (e.g., account exists, network issues)
      console.log(`Placeholder: Create NEAR account ${new_near_account_id} with key ${near_public_key}`);
      const nearCreationSuccess = true; // Placeholder

      if (!nearCreationSuccess) {
         // TODO: Return specific error based on NEAR failure reason
         return c.json({ error: "Failed to create NEAR account" }, 500);
      }

      // 6. Insert user into database
      const dbInstance = getDatabase();
      const db = dbInstance.getWriteDb(); // Use the write connection for inserts

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
        console.error("Failed to insert user into database after successful NEAR creation.");
        return c.json({ error: "Failed to save user profile after account creation" }, 500);
      }

      // 7. Return success response
      return c.json({ profile: newUser }, 201);

    } catch (error: any) { // Added type annotation for error
      console.error("Error creating user profile:", error);
      // TODO: Handle potential duplicate key errors from DB (e.g., near_account_id unique constraint)
      // Check for specific database error codes if needed (e.g., PostgreSQL unique violation code '23505')
      if (error?.code === '23505') {
         // Determine which constraint was violated if possible (check error.constraint)
         // Example: if (error.constraint === 'users_near_account_id_idx') ...
         return c.json({ error: "A user with this NEAR account or identifier already exists." }, 409); // Conflict
      }
      return c.json({ error: "Failed to create user profile" }, 500);
    }
  }
);

// --- PUT /api/users/me ---
// Updates the profile of the currently authenticated user
users.put("/me", /* validator for update fields */ async (c) => {
   // TODO: Implement update logic
   // 1. Get sub_id from auth context
   // 2. Find user by sub_id
   // 3. Validate input fields to update
   // 4. Update user record in DB
   // 5. Return updated profile
   return c.json({ message: "Update endpoint not implemented yet" }, 501);
});


export default users;


- __Backend - NEAR Account Creation:__ The core logic to create the NEAR sub-account in `backend/src/routes/api/users.ts` (within the `POST /users` handler) is still a placeholder (`// 5. TODO: Implement NEAR sub-account creation logic`). This requires installing `near-api-js` in the backend workspace and using the parent account's private key (stored securely) to sign the `createAccount` and `addKey` transactions.
- __Backend - Authentication:__ The API endpoints currently use placeholder authentication (`const sub_id = "placeholder_sub_id";`). Proper authentication middleware needs to be implemented (e.g., using Hono's JWT middleware) to verify the Web3Auth ID token sent from the frontend and securely extract the user's `sub_id`.
- __Backend - Error Handling:__ Enhance error handling in the API routes, especially for potential database unique constraint violations (e.g., `sub_id` or `near_account_id` already exists) and NEAR transaction failures.
- __Database Migration:__ The database migration for the new `users` table needs to be generated (`pnpm run db:generate`) and applied (`pnpm run db:migrate`).
- __Frontend - UI/UX:__ Refine loading states and error messages in the `CreateNearAccountModal` and potentially other UI components interacting with the Web3Auth flow.

