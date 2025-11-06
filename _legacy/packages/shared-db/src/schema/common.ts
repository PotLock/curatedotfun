import { timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const metadataSchema = z
  .object({
    type: z.string(), // URL to the JSON schema, e.g., "/schemas/userProfile.v1.schema.json"
    version: z.string().optional(), // Optional: version of the data instance itself
  })
  .strict();

export type Metadata = z.infer<typeof metadataSchema>;

// Reusable timestamp columns
export const timestamps = {
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  }).defaultNow(),
};
