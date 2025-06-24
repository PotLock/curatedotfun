import {
  ApiErrorResponseSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserDeletedWrappedResponseSchema,
  UserNearAccountIdParamSchema,
  UserProfileWrappedResponseSchema,
} from "@curatedotfun/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { Env } from "../../types/app";
import {
  NearAccountError,
  NotFoundError,
  UserServiceError,
} from "@curatedotfun/utils";
import { logger } from "@curatedotfun/utils";

const usersRoutes = new Hono<Env>();

// --- GET /api/users/me ---
usersRoutes.get("/me", async (c) => {
  const accountId = c.get("accountId");
  const sp = c.var.sp;

  if (!accountId) {
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 401,
        success: false,
        error: { message: "Unauthorized: User not authenticated." },
      }),
      401,
    );
  }

  try {
    const userService = sp.getUserService();
    const user = await userService.findUserByNearAccountId(accountId);

    if (!user) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 404,
          success: false,
          error: {
            message: "User profile not found for the given NEAR account ID.",
          },
        }),
        404,
      );
    }

    return c.json(
      UserProfileWrappedResponseSchema.parse({
        statusCode: 200,
        success: true,
        data: user,
      }),
    );
  } catch (error) {
    logger.error({ error }, "Error in usersRoutes.get('/me')");
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to fetch user profile" },
      }),
      500,
    );
  }
});

// --- POST /api/users ---
usersRoutes.post(
  "/",
  zValidator("json", CreateUserRequestSchema),
  async (c) => {
    const apiData = c.req.valid("json");

    try {
      const sp = c.var.sp;
      const userService = sp.getUserService();

      const newUser = await userService.createUser(apiData);

      return c.json(
        UserProfileWrappedResponseSchema.parse({
          statusCode: 201,
          success: true,
          data: newUser,
        }),
        201,
      );
    } catch (error: unknown) {
      logger.error({ error }, "Error in usersRoutes.post('/')");

      if (
        error instanceof NearAccountError ||
        error instanceof UserServiceError
      ) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to create user profile" },
        }),
        500,
      );
    }
  },
);

// --- PUT /api/users/me ---
usersRoutes.put(
  "/me",
  zValidator("json", UpdateUserRequestSchema),
  async (c) => {
    const apiData = c.req.valid("json");
    const accountId = c.get("accountId");
    const sp = c.var.sp;

    if (!accountId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 401,
          success: false,
          error: { message: "Unauthorized: User not authenticated." },
        }),
        401,
      );
    }

    try {
      const userService = sp.getUserService();
      const updatedUser = await userService.updateUserByNearAccountId(
        accountId,
        apiData,
      );

      if (!updatedUser) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: "User profile not found" },
          }),
          404,
        );
      }

      return c.json(
        UserProfileWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: updatedUser,
        }),
      );
    } catch (error) {
      logger.error({ error }, "Error in usersRoutes.put('/me')");

      if (error instanceof NotFoundError || error instanceof UserServiceError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: error.statusCode as ContentfulStatusCode,
            success: false,
            error: { message: error.message },
          }),
          error.statusCode as ContentfulStatusCode,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to update user profile" },
        }),
        500,
      );
    }
  },
);

// --- DELETE /api/users/me ---
usersRoutes.delete("/me", async (c) => {
  const accountId = c.get("accountId");

  if (!accountId) {
    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 401,
        success: false,
        error: { message: "Unauthorized: User not authenticated." },
      }),
      401,
    );
  }

  try {
    const sp = c.var.sp;
    const userService = sp.getUserService();
    const success = await userService.deleteUserByNearAccountId(accountId);

    if (success) {
      return c.json(
        UserDeletedWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: { message: "User profile deleted successfully" },
        }),
      );
    } else {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to delete user profile" },
        }),
        500,
      );
    }
  } catch (error: unknown) {
    logger.error({ error }, "Error in usersRoutes.delete('/me')");

    if (
      error instanceof NotFoundError ||
      error instanceof NearAccountError ||
      error instanceof UserServiceError
    ) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: error.statusCode as ContentfulStatusCode,
          success: false,
          error: { message: error.message },
        }),
        error.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      ApiErrorResponseSchema.parse({
        statusCode: 500,
        success: false,
        error: { message: "Failed to delete user profile" },
      }),
      500,
    );
  }
});

// --- GET /api/users/by-near/:nearAccountId ---
usersRoutes.get(
  "/by-near/:nearAccountId",
  zValidator("param", UserNearAccountIdParamSchema),
  async (c) => {
    const { nearAccountId } = c.req.param();
    const sp = c.var.sp;

    if (!nearAccountId) {
      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 400,
          success: false,
          error: { message: "nearAccountId path parameter is required." },
        }),
        400,
      );
    }

    try {
      const userService = sp.getUserService();
      const user = await userService.findUserByNearAccountId(nearAccountId);

      if (!user) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: {
              message: "User profile not found for the given NEAR account ID.",
            },
          }),
          404,
        );
      }

      return c.json(
        UserProfileWrappedResponseSchema.parse({
          statusCode: 200,
          success: true,
          data: user,
        }),
      );
    } catch (error) {
      logger.error(
        { error },
        `Error in usersRoutes.get('/by-near/${nearAccountId}')`,
      );

      if (error instanceof NotFoundError) {
        return c.json(
          ApiErrorResponseSchema.parse({
            statusCode: 404,
            success: false,
            error: { message: error.message },
          }),
          404,
        );
      }

      return c.json(
        ApiErrorResponseSchema.parse({
          statusCode: 500,
          success: false,
          error: { message: "Failed to fetch user profile" },
        }),
        500,
      );
    }
  },
);

export { usersRoutes };
