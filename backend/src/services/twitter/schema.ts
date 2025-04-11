import { pgTable as table, text, timestamp } from "drizzle-orm/pg-core";

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
};

export const twitterCookies = table("twitter_cookies", {
  username: text("username").primaryKey(),
  cookies: text("cookies").notNull(), // JSON string of TwitterCookie[]
  ...timestamps,
});

export const twitterCache = table("twitter_cache", {
  key: text("key").primaryKey(), // e.g., "last_tweet_id"
  value: text("value").notNull(),
  ...timestamps,
});
