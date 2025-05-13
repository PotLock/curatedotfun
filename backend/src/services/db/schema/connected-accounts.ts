import {
  pgTable as table,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const connectedAccounts = table(
  "connected_accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // e.g., 'twitter', 'farcaster', 'lens'
    platformUserId: text("platform_user_id").notNull(), // User's unique ID on that platform
    authProviderId: text("auth_provider_id").notNull(), // Identifier from your auth provider (e.g., Web3Auth sub)
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isActive: boolean("is_active").default(true).notNull(),
    data: jsonb("data"), // For any platform-specific data we might want to store
    metadata: jsonb("metadata"), // For any internal metadata
  },
  (table) => [
      uniqueIndex(
        "platform_platform_user_id_unique_idx",
      ).on(table.platform, table.platformUserId),
      uniqueIndex("user_id_platform_unique_idx").on(
        table.userId,
        table.platform,
      ),
      index("ca_user_id_idx").on(table.userId),
      index("ca_platform_user_id_idx").on(
        table.platformUserId,
      ), // Index for faster lookups by platform_user_id
  ]
);

export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type InsertConnectedAccount = typeof connectedAccounts.$inferInsert;
