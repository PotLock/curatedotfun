import { z } from "zod";
import {
  type UsersContractRouter,
  getMyProfileDefinition,
  createUserProfileDefinition,
  updateUserProfileDefinition,
  deleteUserProfileDefinition,
} from "@curatedotfun/api-contract";
import {
  insertUserSchema,
  updateUserSchema,
  selectUserSchema,
  InsertUser,
} from "@curatedotfun/shared-db";
import { protectedProcedure, router, handleServiceError } from "../trpc";
import { TRPCError } from "@trpc/server";

// --- Schemas (matching contract definitions) ---

const UserProfileOutputSchema = z.object({
  profile: selectUserSchema,
});

const UserProfileNullableOutputSchema = z.object({
  profile: selectUserSchema.nullable(),
});

const DeleteUserOutputSchema = z.object({
  message: z.string(),
});

// --- Procedures ---

// GET /users/me
const getMyProfileProcedure = protectedProcedure
  .meta({
    openapi: {
      ...getMyProfileDefinition.meta.openapi,
      tags: [...getMyProfileDefinition.meta.openapi.tags],
    },
  })
  .output(UserProfileNullableOutputSchema)
  .query(async ({ ctx }) => {
    try {
      const userService = ctx.sp.getUserService();
      // authProviderId is already extracted and verified by protectedProcedure
      const user = await userService.findUserByAuthProviderId(
        ctx.authProviderId,
      );
      if (!user) {
        // This case should ideally not be hit if authProviderId guarantees a user,
        // but if a profile can be missing even with valid auth, this is correct.
        // The contract allows nullable, so returning { profile: null } is valid.
        return { profile: null };
      }
      return { profile: user };
    } catch (error) {
      // console.error("Error in usersRoutes.get('/me'):", error); // Logger not directly available
      return handleServiceError(error);
    }
  });

// POST /users
const createUserProfileProcedure = protectedProcedure
  .meta({
    openapi: {
      ...createUserProfileDefinition.meta.openapi,
      tags: [...createUserProfileDefinition.meta.openapi.tags],
    },
  })
  .input(insertUserSchema)
  .output(UserProfileOutputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const userService = ctx.sp.getUserService();
      const newUser = await userService.createUser({
        auth_provider_id: ctx.authProviderId, // From protectedProcedure context
        ...input,
      } as InsertUser);
      return { profile: newUser };
    } catch (error: any) {
      // console.error("Error in usersRoutes.post('/'):", error);
      // Specific error handling from Hono for NearAccountError, UserServiceError
      // This can be mapped to TRPCErrors if desired, or use handleServiceError
      if (
        error.constructor.name === "NearAccountError" ||
        error.constructor.name === "UserServiceError"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST", // Or map statusCode from error if available
          message: error.message,
          cause: error,
        });
      }
      return handleServiceError(error);
    }
  });

// PUT /users/me
const updateUserProfileProcedure = protectedProcedure
  .meta({
    openapi: {
      ...updateUserProfileDefinition.meta.openapi,
      tags: [...updateUserProfileDefinition.meta.openapi.tags],
    },
  })
  .input(updateUserSchema)
  .output(UserProfileOutputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const userService = ctx.sp.getUserService();
      const updatedUser = await userService.updateUser(
        ctx.authProviderId,
        input,
      );
      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found for update",
        });
      }
      return { profile: updatedUser };
    } catch (error: any) {
      // console.error("Error in usersRoutes.put('/me'):", error);
      if (
        error.constructor.name === "NotFoundError" ||
        error.constructor.name === "UserServiceError"
      ) {
        throw new TRPCError({
          code:
            error.constructor.name === "NotFoundError"
              ? "NOT_FOUND"
              : "BAD_REQUEST",
          message: error.message,
          cause: error,
        });
      }
      return handleServiceError(error);
    }
  });

// DELETE /users/me
const deleteUserProfileProcedure = protectedProcedure
  .meta({
    openapi: {
      ...deleteUserProfileDefinition.meta.openapi,
      tags: [...deleteUserProfileDefinition.meta.openapi.tags],
    },
  })
  .output(DeleteUserOutputSchema)
  .mutation(async ({ ctx }) => {
    try {
      const userService = ctx.sp.getUserService();
      const success = await userService.deleteUser(ctx.authProviderId);
      if (success) {
        return { message: "User profile deleted successfully" };
      } else {
        // This case might indicate the user was already deleted or an issue occurred.
        // Throwing an error might be more appropriate than the Hono route's 500.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user profile or user not found",
        });
      }
    } catch (error: any) {
      // console.error("Error in usersRoutes.delete('/me'):", error);
      if (
        error.constructor.name === "NotFoundError" ||
        error.constructor.name === "NearAccountError" ||
        error.constructor.name === "UserServiceError"
      ) {
        throw new TRPCError({
          code:
            error.constructor.name === "NotFoundError"
              ? "NOT_FOUND"
              : "BAD_REQUEST",
          message: error.message,
          cause: error,
        });
      }
      return handleServiceError(error);
    }
  });

// --- Router ---
export const usersRouter: UsersContractRouter = router({
  getMyProfile: getMyProfileProcedure,
  createUserProfile: createUserProfileProcedure,
  updateUserProfile: updateUserProfileProcedure,
  deleteUserProfile: deleteUserProfileProcedure,
});

// for catching type errors
const _assertUsersRouterConforms: UsersContractRouter = usersRouter;
