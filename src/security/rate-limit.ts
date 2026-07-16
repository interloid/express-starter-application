import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Redis } from 'ioredis';
import type { RequestHandler } from 'express';
import { redisClient } from '../lib/redis.js';
import { env } from '../config/env.config.js';

const redis = redisClient;

const noop: RequestHandler = (_req, _res, next) => next();

const RATE_LIMIT_ENABLED = env.RATE_LIMIT_ENABLED;

function buildStore(prefix: string): RedisStore {
  return new RedisStore({
    sendCommand: (...args: Parameters<Redis['call']>) => redis.call(...args) as Promise<never>,
    prefix,
  });
}

export const defaultLimiter: RequestHandler = RATE_LIMIT_ENABLED
  ? rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: 'draft-7',
      skip: (req) => req.path.startsWith('/health'),
      legacyHeaders: false,
      store: buildStore('rl:default:'),
      message: { error: 'Too many requests, please try again later.' },
    })
  : noop;

export const averageRateLimiter: RequestHandler = RATE_LIMIT_ENABLED
  ? rateLimit({
      windowMs: 10 * 1000,
      limit: 20,
      standardHeaders: 'draft-7',
      skip: (req) => req.path.startsWith('/health'),
      legacyHeaders: false,
      store: buildStore('rl:medium:'),
      message: { error: 'Too many requests, please slow down.' },
    })
  : noop;

export const authLimiter: RequestHandler = RATE_LIMIT_ENABLED
  ? rateLimit({
      windowMs: 60 * 1000,
      limit: 5,
      skip: (req) => req.path.startsWith('/health'),
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      store: buildStore('rl:auth:'),
      message: { error: 'Too many attempts, please try again in a minute.' },
    })
  : noop;
