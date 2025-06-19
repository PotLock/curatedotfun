import { z } from "zod";

export const SocialImageSchema = z
  .object({
    url: z.string().url().optional(),
  })
  .strict();
export type SocialImageDto = z.infer<typeof SocialImageSchema>;

export const ProfileSchema = z
  .object({
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    image: SocialImageSchema.optional().nullable(),
    backgroundImage: SocialImageSchema.optional().nullable(),
    linktree: z.record(z.string(), z.string().url()).optional().nullable(),
  })
  .strict();
export type ProfileDto = z.infer<typeof ProfileSchema>;

export const PlatformIdentitySchema = z.object({
  platform: z.string(),
  id: z.string(),
  username: z.string(),
  profileImage: z.string().url().optional().nullable(),
});
export type PlatformIdentityDto = z.infer<typeof PlatformIdentitySchema>;

// --- User Profile Response DTO ---
// As per user's request, excluding email, auth_provider_id, near_public_key, data, and metadata
export const UserProfileResponseSchema = z.object({
  id: z.number(),
  near_account_id: z.string(),
  username: z.string().nullable().optional(),
  platform_identities: z.array(PlatformIdentitySchema).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable().optional(),
});
export type UserProfileResponseDto = z.infer<typeof UserProfileResponseSchema>;

// --- Platform Identity Payloads for API ---
export const PlatformIdentityPayloadSchema = z.object({
  platformName: z.string(),
  platformUserId: z.string(),
  username: z.string(),
  profileImageUrl: z.string().url().optional().nullable(),
});
export type PlatformIdentityPayloadDto = z.infer<
  typeof PlatformIdentityPayloadSchema
>;

export const UpdatePlatformIdentitiesRequestSchema = z.array(
  PlatformIdentityPayloadSchema,
);
export type UpdatePlatformIdentitiesRequestDto = z.infer<
  typeof UpdatePlatformIdentitiesRequestSchema
>;

// --- Create User Profile (Request DTO for POST /users) ---
export const usernameSchema = z
  .string()
  .min(2, "Username must be at least 2 characters long.")
  .max(30, "Username can be at most 30 characters long.")
  .regex(
    /^[a-z0-9_]+$/,
    "Username can only contain lowercase letters, numbers, and underscores.",
  );

export const CreateUserProfileRequestSchema = z.object({
  username: usernameSchema,
  near_account_id: z.string(),
  near_public_key: z.string().optional(),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
});
export type CreateUserProfileRequestDto = z.infer<
  typeof CreateUserProfileRequestSchema
>;

// --- Update User Profile (Request DTO for PUT /users/me) ---
export const UpdateUserProfileRequestSchema = z
  .object({
    username: usernameSchema.optional(),
    email: z.string().email().nullable().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: SocialImageSchema.optional().nullable(),
    backgroundImage: SocialImageSchema.optional().nullable(),
    linktree: z.record(z.string(), z.string().url()).optional().nullable(),
  })
  .partial();
export type UpdateUserProfileRequestDto = z.infer<
  typeof UpdateUserProfileRequestSchema
>;
