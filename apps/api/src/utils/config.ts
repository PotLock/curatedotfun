import { config } from "dotenv";
import path from "path";

const isTest = process.env.NODE_ENV === "test";
/**
 * Loads environment variables from the appropriate .env file
 */
export function loadEnvConfig(): void {
  if (isTest) {
    config({ path: path.resolve(process.cwd(), "backend/.env.test") });
  } else {
    config({ path: path.resolve(process.cwd(), "backend/.env") });
  }
}

/**
 * Gets the allowed origins for CORS from environment variables
 */
export function getAllowedOrigins(): string[] {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : [];
}
