import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/services/db/schema";

// This seed file inserts seed data necessary for tests
async function main() {
  console.log("Seeding test database... ", process.env.DATABASE_URL);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create a connection to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Initialize Drizzle with the pool
  const db = drizzle(pool, { schema });

  try {
    // Clear existing data
    await pool.query(`
      TRUNCATE TABLE feeds CASCADE;
      TRUNCATE TABLE submissions CASCADE;
      TRUNCATE TABLE submission_feeds CASCADE;
      TRUNCATE TABLE moderation_history CASCADE;
      TRUNCATE TABLE feed_plugins CASCADE;
      TRUNCATE TABLE submission_counts CASCADE;
      TRUNCATE TABLE twitter_cookies CASCADE;
      TRUNCATE TABLE twitter_cache CASCADE;
    `);

    console.log("Existing data cleared. Inserting test data...");

    // Insert test feeds
    await db.insert(schema.feeds).values([
      {
        id: "test-feed-1",
        name: "Test Feed 1",
        description: "A test feed for testing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "test-feed-2",
        name: "Test Feed 2",
        description: "Another test feed for testing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "test-feed-3",
        name: "Test Feed 3",
        description: "Yet another test feed for testing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Insert test submissions
    await db.insert(schema.submissions).values([
      {
        tweetId: "tweet-1",
        userId: "user-1",
        username: "testuser1",
        curatorId: "curator-1",
        curatorUsername: "curator1",
        curatorTweetId: "curator-tweet-1",
        content: "Test tweet 1 content",
        curatorNotes: null,
        submittedAt: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        tweetId: "tweet-2",
        userId: "user-2",
        username: "testuser2",
        curatorId: "curator-1",
        curatorUsername: "curator1",
        curatorTweetId: "curator-tweet-2",
        content: "Test tweet 2 content",
        curatorNotes: "Good content",
        submittedAt: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        tweetId: "tweet-3",
        userId: "user-3",
        username: "testuser3",
        curatorId: "curator-2",
        curatorUsername: "curator2",
        curatorTweetId: "curator-tweet-3",
        content: "Test tweet 3 content",
        curatorNotes: null,
        submittedAt: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Insert test submission_feeds
    await db.insert(schema.submissionFeeds).values([
      {
        submissionId: "tweet-1",
        feedId: "test-feed-1",
        status: "pending",
        moderationResponseTweetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        submissionId: "tweet-2",
        feedId: "test-feed-1",
        status: "approved",
        moderationResponseTweetId: "mod-tweet-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        submissionId: "tweet-2",
        feedId: "test-feed-2",
        status: "pending",
        moderationResponseTweetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        submissionId: "tweet-3",
        feedId: "test-feed-3",
        status: "rejected",
        moderationResponseTweetId: "mod-tweet-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Insert test moderation_history
    await db.insert(schema.moderationHistory).values([
      {
        tweetId: "tweet-2",
        feedId: "test-feed-1",
        adminId: "moderator-1",
        action: "approve",
        note: "Approved for feed 1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        tweetId: "tweet-3",
        feedId: "test-feed-3",
        adminId: "moderator-2",
        action: "reject",
        note: "Rejected for feed 3",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Insert test feed_plugins
    await db.insert(schema.feedPlugins).values([
      {
        feedId: "test-feed-1",
        pluginId: "telegram",
        config: '{"channelId": "test-channel-1", "enabled": true}',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        feedId: "test-feed-2",
        pluginId: "rss",
        config: '{"title": "Test RSS Feed", "enabled": true}',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Insert test submission_counts
    await db.insert(schema.submissionCounts).values([
      {
        userId: "user-1",
        count: 1,
        lastResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: "user-2",
        count: 1,
        lastResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: "user-3",
        count: 1,
        lastResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
    throw error;
  } finally {
    // Close the connection
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("An error occurred while seeding:", err);
    process.exit(1);
  });
