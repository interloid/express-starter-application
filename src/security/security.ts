import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Redis } from 'ioredis';
import { env } from '../config/env.config.js';
import { createCsrf, createCsrfProtection, type CsrfInterface } from './csrf.js';
import { defaultLimiter } from './rate-limit.js';

export interface SecurityConfig {
  isLocal: boolean;
  isProduction: boolean;
  corsOrigins: string[];
  csrfEnabled: boolean;
  csrfSecret: string;
}

export interface SecurityDeps {
  redis: Redis;
}
const rateLimitEnabled = env.RATE_LIMIT_ENABLED;

export function setupSecurity(
  app: express.Application,
  config: SecurityConfig,
): { csrf: CsrfInterface } {
  if (!config.isLocal) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-csrf-token',
        'access_token',
        'refresh_token',
      ],
      exposedHeaders: ['x-correlation-id', 'x-request-id'],
    }),
  );
  if (rateLimitEnabled) {
    app.use(defaultLimiter);
  }

  app.use(cookieParser());

  const csrf = createCsrf({
    enabled: config.csrfEnabled,
    secret: config.csrfSecret,
    isProduction: config.isProduction,
  });
  app.use(createCsrfProtection(csrf.protection));

  return { csrf };
}
