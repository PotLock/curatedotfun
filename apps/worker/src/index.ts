import { Queue } from 'bullmq';
import { createQueue } from '@curatedotfun/shared-queue';
import { initializeWorkers, gracefulShutdown } from './worker-lifecycle';
import { workerConfigurations } from './handlers';

const allQueues: Queue<any>[] = workerConfigurations.map(config => createQueue(config.name));

const allWorkers = initializeWorkers();

async function main() {
  console.log('Application started. Workers are listening for jobs...');

  // Handle graceful shutdown signals
  process.on('SIGTERM', async () => {
    await gracefulShutdown(allWorkers, allQueues);
  });

  process.on('SIGINT', async () => { // For Ctrl+C in development
    await gracefulShutdown(allWorkers, allQueues);
  });
}

main().catch(err => {
  console.error('Application critical error:', err);
  process.exit(1);
});
