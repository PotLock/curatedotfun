import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Env } from "../types/app";
import { UserService } from "../services/users.service";
import {
  insertUserSchema,
  updateUserSchema,
} from "../validation/users.validation";

const usersController = new Hono<Env>();

// --- GET /api/users/me ---
usersController.get("/me", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const sub_id = jwtPayload?.sub;

  if (!sub_id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const userService = new UserService(c.var.db);
    const user = await userService.findUserBySubId(sub_id);

    if (!user) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile: user });
  } catch (error) {
    console.error("Error in usersController.get('/me'):", error);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});

// --- POST /api/users ---
usersController.post(
  "/",
  zValidator("json", insertUserSchema),
  async (c) => {
    const createUserData = c.req.valid("json");
    const jwtPayload = c.get("jwtPayload");
    const sub_id = jwtPayload?.sub;

    if (!sub_id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const userService = new UserService(c.var.db);

      const newUser = await userService.createUser({
        sub_id: sub_id,
        username: createUserData.username, 
        near_public_key: createUserData.near_public_key,
        email: createUserData.email,
      });

      return c.json({ profile: newUser }, 201);
    } catch (error: any) {
      console.error("Error in usersController.post('/'):", error);
      if (error.message === "NEAR account name already taken") {
        return c.json({ error: error.message }, 409);
      }
      if (error.message === "Invalid NEAR public key format") {
        return c.json({ error: error.message }, 400);
      }
      if (
        error.message ===
        "A user with this NEAR account or identifier already exists."
      ) {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: "Failed to create user profile" }, 500);
    }
  },
);

// --- PUT /api/users/me ---
usersController.put(
  "/me",
  zValidator("json", updateUserSchema),
  async (c) => {
    const updateData = c.req.valid("json");
    const jwtPayload = c.get("jwtPayload");
    const sub_id = jwtPayload?.sub;

    if (!sub_id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const userService = new UserService(c.var.db);
      const updatedUser = await userService.updateUser(sub_id, updateData);

      if (!updatedUser) {
        return c.json({ error: "User profile not found" }, 404);
      }

      return c.json({ profile: updatedUser });
    } catch (error) {
      console.error("Error in usersController.put('/me'):", error);
      return c.json({ error: "Failed to update user profile" }, 500);
    }
  },
);

export { usersController };
