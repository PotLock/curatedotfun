import { container } from 'tsyringe';
import Redis from 'ioredis';
import { RedisMemoryPlugin } from '../services/memory/redis-memory-plugin';
import { MemoryService } from '../services/memory/memory-service';
import type { MemoryConfig } from '../types/memory-types';

const memoryConfig: MemoryConfig = {
  ttl: process.env.MEMORY_TTL ? parseInt(process.env.MEMORY_TTL) : 86400,
};

// Register memory configuration
container.register('memory', {
  useValue: memoryConfig
});

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
});

// Create and register Redis plugin
const redisPlugin = new RedisMemoryPlugin(redis);

// Register memory service
container.register(MemoryService, {
  useClass: MemoryService
});

// Get memory service instance and register plugin
const memoryService = container.resolve(MemoryService);
memoryService.registerPlugin(redisPlugin);

export { memoryService };
