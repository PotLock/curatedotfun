import { users } from "@curatedotfun/shared-db";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

export const insertUserSchema = createInsertSchema(users, {
  id: z.undefined(),
  auth_provider_id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const selectUserSchema = createSelectSchema(users);

export const updateUserSchema = createUpdateSchema(users, {
  id: z.undefined(),
  auth_provider_id: z.undefined(),
  near_account_id: z.undefined(),
  near_public_key: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
  email: (schema) => schema.email().optional(),
});
