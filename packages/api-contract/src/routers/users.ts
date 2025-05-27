import {
  insertUserSchema,
  selectUserSchema,
  updateUserSchema,
} from "@curatedotfun/types";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// --- Schemas ---

const UserProfileOutputSchema = z.object({
  profile: selectUserSchema,
});

const UserProfileNullableOutputSchema = z.object({
  profile: selectUserSchema.nullable(),
});

const DeleteUserOutputSchema = z.object({
  message: z.string(),
});

// --- Procedure Definitions ---

export const getMyProfileDefinition = {
  meta: {
    openapi: {
      method: "GET",
      path: "/users/me",
      tags: ["users", "profile"],
    } as const,
  },
  output: UserProfileNullableOutputSchema,
};

export const createUserProfileDefinition = {
  meta: {
    openapi: {
      method: "POST",
      path: "/users",
      tags: ["users", "profile"],
    } as const,
  },
  input: insertUserSchema,
  output: UserProfileOutputSchema,
};

export const updateUserProfileDefinition = {
  meta: {
    openapi: {
      method: "PUT",
      path: "/users/me",
      tags: ["users", "profile"],
    } as const,
  },
  input: updateUserSchema,
  output: UserProfileOutputSchema,
};

export const deleteUserProfileDefinition = {
  meta: {
    openapi: {
      method: "DELETE",
      path: "/users/me",
      tags: ["users", "profile"],
    } as const,
  },
  output: DeleteUserOutputSchema,
};

// --- Contract Router ---

const getMyProfileContract = protectedProcedure
  .meta({
    openapi: {
      ...getMyProfileDefinition.meta.openapi,
      tags: [...getMyProfileDefinition.meta.openapi.tags],
    },
  })
  .output(getMyProfileDefinition.output)
  .query(() => {
    throw new Error("Contract method not implemented.");
  });

const createUserProfileContract = protectedProcedure
  .meta({
    openapi: {
      ...createUserProfileDefinition.meta.openapi,
      tags: [...createUserProfileDefinition.meta.openapi.tags],
    },
  })
  .input(createUserProfileDefinition.input)
  .output(createUserProfileDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

const updateUserProfileContract = protectedProcedure
  .meta({
    openapi: {
      ...updateUserProfileDefinition.meta.openapi,
      tags: [...updateUserProfileDefinition.meta.openapi.tags],
    },
  })
  .input(updateUserProfileDefinition.input)
  .output(updateUserProfileDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

const deleteUserProfileContract = protectedProcedure
  .meta({
    openapi: {
      ...deleteUserProfileDefinition.meta.openapi,
      tags: [...deleteUserProfileDefinition.meta.openapi.tags],
    },
  })
  .output(deleteUserProfileDefinition.output)
  .mutation(() => {
    throw new Error("Contract method not implemented.");
  });

export const usersContractRouter = router({
  getMyProfile: getMyProfileContract,
  createUserProfile: createUserProfileContract,
  updateUserProfile: updateUserProfileContract,
  deleteUserProfile: deleteUserProfileContract,
});

export type UsersContractRouter = typeof usersContractRouter;
