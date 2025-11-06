import {
  serial,
  pgTable as table,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { timestamps } from "./common";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const authRequests = table(
  "auth_requests",
  {
    id: serial("id").primaryKey(),
    nonce: text("nonce").notNull().unique(),
    state: text("state").unique(),
    accountId: text("account_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (authRequests) => [
    index("auth_requests_account_id_created_at_idx").on(
      authRequests.accountId,
      authRequests.createdAt,
    ),
  ],
);

export const authRequestsRelations = relations(authRequests, ({ one }) => ({
  user: one(users, {
    fields: [authRequests.accountId],
    references: [users.nearAccountId],
  }),
}));

export const insertAuthRequestSchema = createInsertSchema(authRequests, {
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export type InsertAuthRequest = z.infer<typeof insertAuthRequestSchema>;
