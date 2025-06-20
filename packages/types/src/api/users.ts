import { z } from "zod";
import {
  ApiSuccessResponseSchema,
  ApiSuccessResponse,
  SimpleMessageDataSchema,
  SimpleMessageData,
  NoContentDataSchema,
} from "./common";

export const UserNearAccountIdParamSchema = z.object({
  nearAccountId: z.string().min(1, { message: "NEAR account ID is required" }),
});
export type UserNearAccountIdParam = z.infer<
  typeof UserNearAccountIdParamSchema
>;

export const CreateUserRequestSchema = z.object({
  nearAccountId: z.string().min(1, { message: "NEAR account ID is required" }),
  username: z.string().min(1).max(100).optional(),
  profileImage: z
    .string()
    .url({ message: "Invalid URL format for profile image" })
    .optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  username: z.string().min(1).max(100).optional().nullable(),
  profileImage: z
    .string()
    .url({ message: "Invalid URL format for profile image" })
    .optional()
    .nullable(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export const PlatformIdentitySchema = z.object({
  platformName: z.string().min(1),
  platformUserId: z.string().min(1),
  username: z.string().min(1),
  profileImage: z.string().url().optional(),
});
export type PlatformIdentity = z.infer<typeof PlatformIdentitySchema>;

export const UpdatePlatformIdentitiesRequestSchema = z.array(
  PlatformIdentitySchema,
);
export type UpdatePlatformIdentitiesRequest = z.infer<
  typeof UpdatePlatformIdentitiesRequestSchema
>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  nearAccountId: z.string(),
  username: z.string().optional().nullable(),
  profileImage: z.string().url().optional().nullable(),
  createdAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
  updatedAt: z.preprocess(
    (arg) => (arg instanceof Date ? arg.toISOString() : arg),
    z.string().datetime(),
  ),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserProfileWrappedResponseSchema =
  ApiSuccessResponseSchema(UserProfileSchema);
export type UserProfileWrappedResponse = ApiSuccessResponse<UserProfile>;

export const UserDeletedWrappedResponseSchema = ApiSuccessResponseSchema(
  SimpleMessageDataSchema,
);
export type UserDeletedWrappedResponse = ApiSuccessResponse<SimpleMessageData>;

export const PlatformIdentitiesUpdatedWrappedResponseSchema =
  ApiSuccessResponseSchema(NoContentDataSchema);
export type PlatformIdentitiesUpdatedWrappedResponse =
  ApiSuccessResponse<undefined>;
