import { sqliteTable as table, text } from "drizzle-orm/sqlite-core";

// Reusable timestamp columns
const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
};

export const twitterCookies = table(
  "twitter_cookies",
  {
    username: text("username").primaryKey(),
    cookies: text("cookies").notNull(), // JSON string of TwitterCookie[]
    ...timestamps,
  }
);

export const twitterCache = table(
  "twitter_cache",
  {
    key: text("key").primaryKey(), // e.g., "last_tweet_id"
    value: text("value").notNull(),
    ...timestamps,
  }
);
