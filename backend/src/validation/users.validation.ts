import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import * as schema from "../services/db/schema";

export const insertUserSchema = createInsertSchema(schema.users, {
  id: z.undefined(),
  sub_id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
});

export const selectUserSchema = createSelectSchema(schema.users);

export const updateUserSchema = createUpdateSchema(schema.users, {
  id: z.undefined(),
  sub_id: z.undefined(),
  near_account_id: z.undefined(),
  near_public_key: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
  email: (schema) => schema.email().optional(),
});
