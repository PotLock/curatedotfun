import { ConfigService } from "../services/config";
import { AppConfig } from "@curatedotfun/types";

export function validateEnv() {
  // Validate required Twitter credentials
  if (
    !process.env.TWITTER_USERNAME ||
    !process.env.TWITTER_PASSWORD ||
    !process.env.TWITTER_EMAIL
  ) {
    throw new Error(
      "Missing required Twitter credentials. Please ensure TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL are set in your environment variables.",
    );
  }
}

const configService = ConfigService.getInstance();

export function getConfig(): AppConfig {
  return configService.getConfig();
}

export default configService;
