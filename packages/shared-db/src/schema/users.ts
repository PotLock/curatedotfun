import {
  index,
  jsonb,
  serial,
  pgTable as table,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { z } from "zod";
import { timestamps, Metadata } from "./common";
import { feeds } from "./feeds";

export const socialImageSchema = z
  .object({
    url: z.string().url().optional(),
  })
  .strict();

export const profileSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    image: socialImageSchema.optional(),
    backgroundImage: socialImageSchema.optional(),
    linktree: z.record(z.string(), z.string().url()).optional(),
  })
  .strict();

export type Profile = z.infer<typeof profileSchema>;
export type SocialImage = z.infer<typeof socialImageSchema>;

export const platformIdentitySchema = z.object({
  platform: z.string(),
  id: z.string(),
  username: z.string(),
  profileImage: z.string().url().optional(),
});

export type PlatformIdentity = z.infer<typeof platformIdentitySchema>;

// Users Table
export const users = table(
  "users",
  {
    id: serial("id").primaryKey(),
    authProviderId: text("auth_provider_id").unique(), // Unique identifier from Web3Auth
    nearAccountId: text("near_account_id").notNull().unique(), // e.g., chosenname.users.curatedotfun.near
    nearPublicKey: text("near_public_key").unique(), // ed25519 public key
    username: text("username"), // Optional: display name
    profileImage: text("profile_image"), // Optional: profile image override
    email: text("email"), // Optional: email, not used rn, idk if I ever want to
    ...timestamps,
  },
  (users) => [
    uniqueIndex("users_auth_provider_id_idx").on(users.authProviderId),
    uniqueIndex("users_near_account_id_idx").on(users.nearAccountId),
    uniqueIndex("users_near_public_key_idx").on(users.nearPublicKey),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  createdFeeds: many(feeds, {
    relationName: "FeedCreator",
  }),
}));
