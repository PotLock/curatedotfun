import { sqliteTable as table, text, integer } from "drizzle-orm/sqlite-core";
import { feeds } from "../db/schema";

// Reusable timestamp columns
const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
};

export const rssItems = table(
  "rss_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    link: text("link"),
    guid: text("guid"),
    publishedAt: text("published_at").notNull(),
    ...timestamps,
  }
);
