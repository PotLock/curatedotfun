import {
  index,
  jsonb,
  serial,
  pgTable as table,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { timestamps, Metadata } from "./common";

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

// Users Table
export const users = table(
  "users",
  {
    id: serial("id").primaryKey(),
    auth_provider_id: text("auth_provider_id").notNull().unique(), // Unique identifier from Web3Auth (previously sub_id)
    near_account_id: text("near_account_id").unique(), // e.g., chosenname.users.curatedotfun.near
    near_public_key: text("near_public_key").notNull().unique(), // ed25519 public key
    username: text("username"), // Optional: display name
    email: text("email"), // Optional: email from Web3Auth

    // Dynamic app-specific JSON data and its metadata
    metadata: jsonb("metadata").$type<Metadata>(), // Holds type (schema URL) and other meta info
    data: jsonb("data").$type<Profile>(), // Holds the actual user profile data

    ...timestamps, // createdAt, updatedAt
  },
  (users) => [
    uniqueIndex("users_auth_provider_id_idx").on(users.auth_provider_id),
    uniqueIndex("users_near_account_id_idx").on(users.near_account_id),
    uniqueIndex("users_near_public_key_idx").on(users.near_public_key),
    // Index on metadata type for efficient queries
    index("metadata_type_idx").on(sql`(${users.metadata} ->> 'type')`),
  ],
);
