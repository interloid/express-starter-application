import { Redis } from 'ioredis';
import { env } from '../config/env.config.js';
import { logger } from '../utils/logger.js';
import type { ConnectionOptions } from 'bullmq';

const redis = new Redis(env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

export const redisClient = redis;

export const bullMqConnection = redis as unknown as ConnectionOptions;
