import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENROUTER_API_KEY: z.string().optional(),
    CRYPTOGRANTWIRE_NOTION_TOKEN: z.string().optional(),
    GRANTS_RSS_API_SECRET: z.string().optional(),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    ETHEREUM_RSS_API_SECRET: z.string().optional(),
    NEAR_RSS_API_SECRET: z.string().optional(),
    DESCI_RSS_API_SECRET: z.string().optional(),
    SOLANA_RSS_API_SECRET: z.string().optional(),
    EIGEN_RSS_API_SECRET: z.string().optional(),
    ABSTRACTION_RSS_API_SECRET: z.string().optional(),
    VIETNAM_RSS_API_SECRET: z.string().optional(),
    USA_RSS_API_SECRET: z.string().optional(),
    SHIPPOST_NEAR_SOCIAL_KEY: z.string().optional(),
    SHIPPOST_RSS_API_SECRET: z.string().optional(),
    SUI_RSS_API_SECRET: z.string().optional(),
    STABLECOINS_RSS_API_SECRET: z.string().optional(),
    CLIMATE_RSS_API_SECRET: z.string().optional(),
    XPOSTBOUNTY1_NOTION_TOKEN: z.string().optional(),
    XPOSTBOUNTY1_RSS_API_SECRET: z.string().optional(),
    AFROBEATS_RSS_API_SECRET: z.string().optional(),
    AFRICA_RSS_API_SECRET: z.string().optional(),

    SECRET_SERVICE_URL: z
      .string()
      .url({ message: "SECRET_SERVICE_URL must be a valid URL" }),
    SECRET_SERVICE_INTERNAL_API_KEY: z
      .string()
      .min(1, { message: "SECRET_SERVICE_INTERNAL_API_KEY must be defined" }),
  },

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});
