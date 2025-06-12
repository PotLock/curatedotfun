import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { Env } from "../../types/app";
import {
  NearAccountError,
  NotFoundError,
  UserServiceError,
} from "../../types/errors";
import { ServiceProvider } from "../../utils/service-provider";
import { insertUserSchema, updateUserSchema } from "@curatedotfun/shared-db";

const usersRoutes = new Hono<Env>();

// --- GET /api/users/me ---
usersRoutes.get("/me", async (c) => {
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json({ error: "Unauthorized: User not authenticated." }, 401);
  }

  try {
    const userService = ServiceProvider.getInstance().getUserService();
    const user = await userService.findUserByNearAccountId(accountId);

    if (!user) {
      return c.json(
        { error: "User profile not found for the given NEAR account ID." },
        404,
      );
    }

    return c.json({ profile: user });
  } catch (error) {
    console.error("Error in usersRoutes.get('/me'):", error);
    return c.json({ error: "Failed to fetch user profile" }, 500);
  }
});

// --- POST /api/users ---
usersRoutes.post("/", zValidator("json", insertUserSchema), async (c) => {
  const createUserData = c.req.valid("json");

  try {
    const userService = ServiceProvider.getInstance().getUserService();

    const newUser = await userService.createUser(createUserData);

    return c.json({ profile: newUser }, 201);
  } catch (error: any) {
    console.error("Error in usersRoutes.post('/'):", error);

    if (error instanceof NearAccountError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    if (error instanceof UserServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to create user profile" }, 500);
  }
});

// --- PUT /api/users/me ---
usersRoutes.put("/me", zValidator("json", updateUserSchema), async (c) => {
  const updateData = c.req.valid("json");
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json({ error: "Unauthorized: User not authenticated." }, 401);
  }

  try {
    const userService = ServiceProvider.getInstance().getUserService();
    const updatedUser = await userService.updateUserByNearAccountId(
      accountId,
      updateData,
    );

    if (!updatedUser) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ profile: updatedUser });
  } catch (error) {
    console.error("Error in usersRoutes.put('/me'):", error);

    if (error instanceof NotFoundError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    if (error instanceof UserServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to update user profile" }, 500);
  }
});

// --- DELETE /api/users/me ---
usersRoutes.delete("/me", async (c) => {
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json({ error: "Unauthorized: User not authenticated." }, 401);
  }

  try {
    const userService = ServiceProvider.getInstance().getUserService();
    const success = await userService.deleteUserByNearAccountId(accountId);

    if (success) {
      return c.json({ message: "User profile deleted successfully" }, 200);
    } else {
      return c.json({ error: "Failed to delete user profile" }, 500);
    }
  } catch (error: any) {
    console.error("Error in usersRoutes.delete('/me'):", error);

    if (error instanceof NotFoundError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    if (error instanceof NearAccountError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    if (error instanceof UserServiceError) {
      return c.json(
        { error: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json({ error: "Failed to delete user profile" }, 500);
  }
});

export { usersRoutes };
