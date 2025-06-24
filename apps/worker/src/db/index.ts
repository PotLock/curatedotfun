import { schema, type DB } from "@curatedotfun/shared-db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db: DB = drizzle({ client: pool, schema, casing: "snake_case" });

export { db, pool };
