import { Queue } from 'bullmq';
import 'dotenv/config'; 

let queue: Queue | undefined;

export function initializeGatewayQueueProducer(): Queue {

  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;

  if (!redisHost || !redisPort) {
    console.error('REDIS_HOST or REDIS_PORT environment variables are not set.');
    throw new Error('Redis configuration is missing for gateway queue producer.');
  }

  const redisConnection = {
    host: redisHost,
    port: parseInt(redisPort, 10),
  };

  // Optional: Define default job options if needed for the producer side
  // const defaultJobOptions = { attempts: 3, backoff: { type: 'exponential', delay: 1000 }};
  
  workerRuleExecutionQueueInstance = createRuleExecutionQueueProducer(redisConnection /*, defaultJobOptions */);
  console.log('🟢 Gateway BullMQ Producer connected to queue for worker.');
  return workerRuleExecutionQueueInstance;
}

export function getWorkerRuleExecutionQueue(): Queue {
  if (!workerRuleExecutionQueueInstance) {
    // This case should ideally not be hit if initialize is called at startup.
    // However, as a fallback, try to initialize.
    // Consider if throwing an error is more appropriate if not initialized by design.
    console.warn('Worker rule execution queue accessed before explicit initialization. Attempting to initialize...');
    return initializeGatewayQueueProducer();
  }
  return workerRuleExecutionQueueInstance;
}

// Call initialize at module load time, or ensure it's called during app startup.
// For simplicity here, let's initialize it, but in a real app, this might be part of a startup sequence.
// initializeGatewayQueueProducer(); 
// Better to explicitly call initializeGatewayQueueProducer() in your main app setup (e.g., apps/gateway/src/index.ts)
