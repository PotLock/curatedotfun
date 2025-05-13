import { timestamp } from "drizzle-orm/pg-core";

export type Metadata = {
  type: string; // URL to the JSON schema, e.g., "/schemas/userProfile.v1.schema.json"
  version?: string; // Optional: version of the data instance itself
  // other potential meta-fields: lastValidated, sourceSystem etc.
};

export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
};