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
    auth_provider_id: text("auth_provider_id").unique(), // Unique identifier from Web3Auth
    near_account_id: text("near_account_id").notNull().unique(), // e.g., chosenname.users.curatedotfun.near
    near_public_key: text("near_public_key").unique(), // ed25519 public key
    username: text("username"), // Optional: display name
    email: text("email"), // Optional: email from Web3Auth

    // Dynamic app-specific JSON data and its metadata
    metadata: jsonb("metadata").$type<Metadata>(), // Holds type (schema URL) and other meta info
    data: jsonb("data").$type<Profile>(),
    platform_identities: jsonb("platform_identities")
      .$type<PlatformIdentity[]>()
      .default(sql`'[]'::jsonb`),

    ...timestamps,
  },
  (users) => [
    uniqueIndex("users_auth_provider_id_idx").on(users.auth_provider_id),
    uniqueIndex("users_near_account_id_idx").on(users.near_account_id),
    uniqueIndex("users_near_public_key_idx").on(users.near_public_key),
    index("metadata_type_idx").on(sql`(${users.metadata} ->> 'type')`),
    index("platform_identities_idx").on(users.platform_identities), // Index for platform_identities
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  createdFeeds: many(feeds, {
    relationName: "FeedCreator",
  }),
}));
