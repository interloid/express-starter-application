import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { env } from './env.config.js';

export function createRedisClient(): Redis {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error:', { message: err.message });
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  return redis;
}
