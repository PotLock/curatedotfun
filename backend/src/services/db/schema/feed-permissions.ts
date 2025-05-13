import {
  index,
  integer,
  jsonb,
  pgTable as table,
  serial,
  text,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { Metadata, timestamps } from "./common";
import { feeds } from "./feeds";
import { users } from "./users";

export const feedPermissions = table(
  "feed_permissions",
  {
    id: serial("id").primaryKey(),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }), // Nullable
    platform: text("platform"), // Nullable, e.g., 'twitter'
    platformUserId: text("platform_user_id"), // Nullable
    role: text("role").notNull(), // e.g., 'approver', 'editor', 'owner'
    ...timestamps,
    data: jsonb("data").$type<Partial<any>>(),
    metadata: jsonb("metadata").$type<Metadata>(),
  },
  (table) => [
    uniqueIndex("feed_user_role_unique_idx").on(
      table.feedId,
      table.userId,
      table.role,
    ), // For claimed permissions
    uniqueIndex(
      "feed_platform_user_role_unique_idx",
    ).on(table.feedId, table.platform, table.platformUserId, table.role), // For unclaimed platform permissions
    index("fp_feed_id_idx").on(table.feedId),
    index("fp_user_id_idx").on(table.userId),
    index("fp_platform_user_id_lookup_idx").on(
      table.platform,
      table.platformUserId,
    ),
  ],
);

export type FeedPermission = typeof feedPermissions.$inferSelect;
export type InsertFeedPermission = typeof feedPermissions.$inferInsert;
