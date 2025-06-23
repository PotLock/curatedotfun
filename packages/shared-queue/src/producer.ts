import { Queue, QueueOptions } from 'bullmq';
import { RULE_EXECUTION_QUEUE_NAME } from './constants';

/**
 * Creates a BullMQ Queue instance for producing jobs to the rule execution queue.
 * @param redisConnectionOpts Connection options for Redis (e.g., { host: 'localhost', port: 6379 })
 * @param defaultJobOptions Optional default job options for the queue.
 * @returns A BullMQ Queue instance.
 */
export function createRuleExecutionQueueProducer(
  redisConnectionOpts: QueueOptions['connection'],
  defaultJobOptions?: QueueOptions['defaultJobOptions']
): Queue {
  return new Queue(RULE_EXECUTION_QUEUE_NAME, {
    connection: redisConnectionOpts,
    defaultJobOptions: defaultJobOptions || {
      // Sensible defaults if none provided, or leave empty to use BullMQ defaults
      // attempts: 3,
      // backoff: {
      //   type: 'exponential',
      //   delay: 1000,
      // },
    },
  });
}
