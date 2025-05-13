import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  serial,
  pgTable as table,
  text,
  uniqueIndex
} from "drizzle-orm/pg-core";

import { Profile } from "../../../types/zod/userProfile";
import { Metadata, timestamps } from "./common";

export const users = table(
  "users",
  {
    id: serial("id").primaryKey(),
    auth_provider_id: text("auth_provider_id").notNull().unique(),
    near_account_id: text("near_account_id").unique(), // e.g., chosenname.users.curatedotfun.near
    near_public_key: text("near_public_key").notNull().unique(),
    username: text("username"),
    email: text("email"),

    metadata: jsonb("metadata").$type<Metadata>(),
    data: jsonb("data").$type<Profile>(),

    ...timestamps,
  },
  (users) => ([
    uniqueIndex("users_auth_provider_id_idx").on(
      users.auth_provider_id,
    ),
    uniqueIndex("users_near_account_id_idx").on(
      users.near_account_id,
    ),
    uniqueIndex("users_near_public_key_idx").on(
      users.near_public_key,
    ),
    index("metadata_type_idx").on(
      sql`(${users.metadata} ->> 'type')`,
    ),
  ]),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
