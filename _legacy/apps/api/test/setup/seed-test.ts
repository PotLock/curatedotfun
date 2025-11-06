import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@curatedotfun/shared-db";

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
