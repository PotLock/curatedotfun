import "dotenv/config";
import { Queue } from "bullmq";
import { createQueue, QUEUE_NAMES } from "@curatedotfun/shared-queue"; // Added QUEUE_NAMES
import { initializeWorkers, gracefulShutdown } from "./worker-lifecycle";
import { workerConfigurations } from "./handlers"; // This will be updated later
import { ServiceProvider } from "@curatedotfun/core-services";
import { db } from "./db";
import { logger } from "@curatedotfun/utils";

// Create queues for all registered worker configurations and any other necessary queues
// For now, this includes the default queue from existing handlers,
// and we'll add MODERATION and SUBMISSION_PROCESSING queues explicitly.
const queueNames = new Set(workerConfigurations.map((config) => config.name));
queueNames.add(QUEUE_NAMES.MODERATION);
queueNames.add(QUEUE_NAMES.SUBMISSION_PROCESSING);

const allQueues: Queue<any>[] = Array.from(queueNames).map((name) =>
  createQueue(name),
);

async function main() {
  logger.info("Starting Curate.fun Worker...");

  const sp = new ServiceProvider({
    db,
    logger,
    env: {
      NODE_ENV: process.env.NODE_ENV || "development",
      SUPER_ADMIN_ACCOUNTS: process.env.SUPER_ADMIN_ACCOUNTS,
      TWITTER_USERNAME: process.env.TWITTER_USERNAME,
      TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
      TWITTER_EMAIL: process.env.TWITTER_EMAIL,
      TWITTER_2FA_SECRET: process.env.TWITTER_2FA_SECRET,
      MASTER_KEYPAIR: process.env.MASTER_KEYPAIR,
    },
  });
  await sp.init(); // Initialize services

  const allWorkers = initializeWorkers(sp); // Pass ServiceProvider to initializeWorkers

  logger.info("Application started. Workers are listening for jobs...");

  // Handle graceful shutdown signals
  process.on("SIGTERM", async () => {
    await gracefulShutdown(allWorkers, allQueues);
  });

  process.on("SIGINT", async () => {
    // For Ctrl+C in development
    await gracefulShutdown(allWorkers, allQueues);
  });
}

main().catch((err) => {
  logger.error({ err }, "Application critical error");
  process.exit(1);
});
