import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { Env } from "../types/app";
import { InsertUserData, UserService } from "../services/users.service";
import {
  insertUserSchema,
  updateUserSchema,
} from "../validation/users.validation";
import { NearAccountError, NotFoundError, UserServiceError } from "../types/errors";
import { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";

const usersController = new Hono<Env>();

// --- GET /api/users/me ---
usersController.get("/me", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    const userService = new UserService(c.var.db);
    const user = await userService.findUserByAuthProviderId(authProviderId);

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
usersController.post("/", zValidator("json", insertUserSchema), async (c) => {
  const createUserData = c.req.valid("json");
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    const userService = new UserService(c.var.db);

    const newUser = await userService.createUser({
      auth_provider_id: authProviderId,
      ...createUserData,
    } as InsertUserData);

    return c.json({ profile: newUser }, 201);
  } catch (error: any) {
    console.error("Error in usersController.post('/'):", error);
    
    if (error instanceof NearAccountError) {
      return c.json({ error: error.message }, error.statusCode as ContentfulStatusCode);
    }
    
    if (error instanceof UserServiceError) {
      return c.json({ error: error.message }, error.statusCode as ContentfulStatusCode);
    }
    
    return c.json({ error: "Failed to create user profile" }, 500);
  }
});

// --- PUT /api/users/me ---
usersController.put("/me", zValidator("json", updateUserSchema), async (c) => {
  const updateData = c.req.valid("json");
  const jwtPayload = c.get("jwtPayload");
  const authProviderId = jwtPayload?.authProviderId;

  if (!authProviderId) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authentication token" },
      401,
    );
  }

  try {
    const userService = new UserService(c.var.db);
    const updatedUser = await userService.updateUser(authProviderId, updateData);

    if (!updatedUser) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile: updatedUser });
  } catch (error) {
    console.error("Error in usersController.put('/me'):", error);
    
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, error.statusCode as ContentfulStatusCode);
    }
    
    if (error instanceof UserServiceError) {
      return c.json({ error: error.message }, error.statusCode as ContentfulStatusCode);
    }
    
    return c.json({ error: "Failed to update user profile" }, 500);
  }
});

export { usersController };
