import { pgTable, text } from "drizzle-orm/pg-core";
import { timestamps } from "./common";

// will not be needed after Masa
export const twitterCookies = pgTable("twitter_cookies", {
  username: text("username").primaryKey(),
  cookies: text("cookies").notNull(), // JSON string of TwitterCookie[]
  ...timestamps,
});

// done differently after Masa
export const twitterCache = pgTable("twitter_cache", {
  key: text("key").primaryKey(), // e.g., "last_tweet_id"
  value: text("value").notNull(),
  ...timestamps,
});
