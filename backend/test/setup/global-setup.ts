import { execSync } from "child_process";
import { join } from "path";
import { Pool } from "pg";

export default async () => {
  console.time("global-setup");

  // Start Docker Compose for PostgreSQL
  const dockerComposePath = join(__dirname, "docker-compose.yml");
  const waitForDbScript = join(process.cwd(), "test", "wait-for-db.sh");
  const seedSqlPath = join(__dirname, "seed", "seed.sql");

  console.log("Starting PostgreSQL container for tests...");

  try {
    // Start the PostgreSQL container
    execSync(`docker-compose -f ${dockerComposePath} up -d`, {
      stdio: "inherit",
    });

    // Wait for PostgreSQL to be ready using the wait script
    console.log("Waiting for PostgreSQL to be ready...");
    execSync(`${waitForDbScript} localhost 54321`, { stdio: "inherit" });

    // Set environment variables for test database
    const dbConnectionString =
      "postgresql://postgres:postgres@localhost:54321/test";
    process.env.DATABASE_URL = dbConnectionString;
    process.env.DATABASE_WRITE_URL = dbConnectionString;
    process.env.DATABASE_READ_URL = dbConnectionString;

    // Create a connection pool to verify database access
    const pool = new Pool({
      connectionString: dbConnectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Verify connection
    try {
      console.log("Verifying database connection...");
      const result = await pool.query("SELECT 1 as number");
      console.log(
        `Database connection verified: ${result.rows[0].number === 1 ? "Success" : "Failed"}`,
      );
    } catch (connError) {
      console.error("Database connection verification failed:", connError);
      throw connError;
    }

    // Run PostgreSQL schema initialization script
    console.log("Initializing database schema...");
    const schemaPath = join(
      process.cwd(),
      "scripts",
      "init-db",
      "01-init-schema.sql",
    );

    // Check if schema file exists
    const fs = require("fs");
    if (!fs.existsSync(schemaPath)) {
      console.error(`Schema file not found at: ${schemaPath}`);
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(
        `Directory contents:`,
        fs.readdirSync(join(process.cwd(), "scripts", "init-db")),
      );
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    console.log(`Schema file found at: ${schemaPath}`);

    // Add a delay to ensure the database is ready
    console.log("Waiting 2 seconds before initializing schema...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Run the schema initialization script with full path and verbose output
      const command = `PGPASSWORD=postgres psql -h localhost -p 54321 -U postgres -d test -v ON_ERROR_STOP=1 -f "${schemaPath}"`;
      console.log(`Executing command: ${command}`);

      execSync(command, {
        stdio: "inherit",
        cwd: process.cwd(), // Ensure we're in the right directory
      });

      console.log("Database schema initialized successfully");
    } catch (schemaError) {
      console.error("Error initializing schema:", schemaError);
      throw schemaError;
    }

    // Verify schema was created
    try {
      console.log("Verifying schema creation...");
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log(
        "Tables created:",
        tables.rows.map((row) => row.table_name).join(", "),
      );

      if (tables.rows.length === 0) {
        throw new Error("No tables were created in the database");
      }
    } catch (verifyError) {
      console.error("Schema verification failed:", verifyError);
      throw verifyError;
    }

    // Seed the database with test data
    console.log("Seeding database with test data...");

    // Check if seed file exists
    if (!fs.existsSync(seedSqlPath)) {
      console.error(`Seed file not found at: ${seedSqlPath}`);
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(
        `Directory contents:`,
        fs.readdirSync(join(__dirname, "seed")),
      );
      throw new Error(`Seed file not found: ${seedSqlPath}`);
    }

    console.log(`Seed file found at: ${seedSqlPath}`);

    // Add a delay to ensure the schema is ready
    console.log("Waiting 1 second before seeding database...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // Run the seed script with full path and verbose output
      const seedCommand = `PGPASSWORD=postgres psql -h localhost -p 54321 -U postgres -d test -v ON_ERROR_STOP=1 -f "${seedSqlPath}"`;
      console.log(`Executing command: ${seedCommand}`);

      execSync(seedCommand, {
        stdio: "inherit",
        cwd: process.cwd(), // Ensure we're in the right directory
      });

      console.log("Database seeded successfully");
    } catch (seedError) {
      console.error("Error seeding database:", seedError);
      throw seedError;
    }

    // Verify seed data was inserted
    try {
      console.log("Verifying seed data...");
      const feedCount = await pool.query("SELECT COUNT(*) FROM feeds");
      const submissionCount = await pool.query(
        "SELECT COUNT(*) FROM submissions",
      );

      console.log(
        `Seed verification: ${feedCount.rows[0].count} feeds, ${submissionCount.rows[0].count} submissions`,
      );

      if (
        parseInt(feedCount.rows[0].count) === 0 ||
        parseInt(submissionCount.rows[0].count) === 0
      ) {
        console.warn("Warning: Seed data may not have been properly inserted");
      }
    } catch (verifyError) {
      console.error("Seed verification failed:", verifyError);
      // Don't throw here, just log the error
    }

    // Close the pool
    await pool.end();
  } catch (error) {
    console.error("Error setting up test environment:", error);
    throw error; // Rethrow to fail the tests if setup fails
  }

  console.timeEnd("global-setup");
};
