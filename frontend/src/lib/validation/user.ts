import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(2, "Username must be at least 2 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-z0-9]+$/, "Username must be lowercase letters and numbers only");

export const userProfileSchema = z.object({
  id: z.number(),
  sub_id: z.string(),
  near_account_id: z.string().nullable(),
  near_public_key: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
