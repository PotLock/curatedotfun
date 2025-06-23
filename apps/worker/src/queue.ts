const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

// Graceful shutdown
async function shutdown() {
  console.log('🟡 Shutting down BullMQ worker and queue...');
  console.log('🟢 BullMQ worker and queue shut down.');
}

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
