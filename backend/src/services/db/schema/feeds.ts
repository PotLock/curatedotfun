import {
  jsonb,
  pgTable as table,
  text
} from "drizzle-orm/pg-core";
import { FeedConfig } from "../../../types/config";
import { timestamps } from "./common";

export const feeds = table("feeds", {
  id: text("id").primaryKey(),
  config: jsonb("config").$type<FeedConfig>().notNull(),
  name: text("name").notNull(),
  description: text("description"),

  // TODO: Metadata, Data
  ...timestamps,
});

export type Feed = typeof feeds.$inferSelect;
export type InsertFeed = typeof feeds.$inferInsert;
