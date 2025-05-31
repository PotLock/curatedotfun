import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// This path is relative to `packages/shared-db/drizzle.config.ts`
dotenv.config({ path: "../../api/.env" });

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Ensure DATABASE_URL is set in your .env file at the monorepo root
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
