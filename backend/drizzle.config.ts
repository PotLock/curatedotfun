import type { Config } from "drizzle-kit";
import { join } from "path";
import { mkdirSync } from "fs";

// Ensure database directory exists
const DB_DIR = join(process.cwd(), ".db");
try {
  mkdirSync(DB_DIR, { recursive: true });
} catch (e) {
  // Directory already exists, ignore error
}

const DB_PATH =
  process.env.DATABASE_URL?.replace("file:", "") ||
  join(DB_DIR, "submissions.sqlite");

export default {
  schema: "./src/services/db/schema.ts",
  out: "./src/services/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${DB_PATH}`,
  },
} satisfies Config;
