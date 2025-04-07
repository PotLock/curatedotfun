import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/services/db/schema";

// Customize this seed file for your development purposes
async function main() {
  console.log("Seeding dev database... ", process.env.DATABASE_URL);

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
    // Only clear existing data if FRESH is set to true
    if (process.env.FRESH === "true") {
      console.log("Clearing existing data...");
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
      console.log("Existing data cleared. Inserting dev data...");
    } else {
      console.log("Preserving existing data...");
    }

    // Insert feeds
    // await db.insert(schema.feeds).values([
    // This happens in submission service
    // ]);

    // Insert submissions
    // await db.insert(schema.submissions).values([

    // ]);

    // Insert submission_feeds
    // await db.insert(schema.submissionFeeds).values([

    // ]);

    // Insert moderation_history
    // await db.insert(schema.moderationHistory).values([

    // ]);

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
