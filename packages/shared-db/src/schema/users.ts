import { relations } from "drizzle-orm";
import {
  serial,
  pgTable as table,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { activities, feedUserStats, userStats } from "./activity";
import { timestamps } from "./common";
import { feeds } from "./feeds";

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
  activities: many(activities, {
    relationName: "UserActivities",
  }),
  userStats: many(userStats, {
    relationName: "UserStats",
  }),
  feedUserStats: many(feedUserStats, {
    relationName: "UserFeedStats",
  }),
}));

export const insertUserSchema = createInsertSchema(users, {
  id: z.undefined(),
  authProviderId: z.string().optional(),
  nearPublicKey: z.string().optional(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const updateUserSchema = createUpdateSchema(users, {
  id: z.undefined(),
  authProviderId: z.undefined(),
  nearAccountId: z.undefined(),
  nearPublicKey: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
}).extend({
  email: z.string().email().optional().nullable(),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;
