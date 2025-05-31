import { schema, type DB } from "@curatedotfun/shared-db";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
const db: DB = drizzle(pool, { schema });

export { db, pool };
