import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Redis } from 'ioredis';
import { redisClient } from '../lib/redis.js';

const redis = redisClient;

function buildStore(prefix: string): RedisStore {
  return new RedisStore({
    sendCommand: (...args: Parameters<Redis['call']>) => redis.call(...args) as Promise<never>,
    prefix,
  });
}

export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('rl:default:'),
  message: { error: 'Too many requests, please try again later.' },
});

export const averageRateLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('rl:medium:'),
  message: { error: 'Too many requests, please slow down.' },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('rl:auth:'),
  message: { error: 'Too many attempts, please try again in a minute.' },
});
