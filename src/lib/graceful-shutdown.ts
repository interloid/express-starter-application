import type { Server } from 'node:http';
import type { Worker } from 'bullmq';
import { prisma } from './prisma.js';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

interface ShutdownResources {
  server: Server;
  worker: Worker;
  redis: Redis;
}

let shuttingDown = false;

export async function gracefulShutdown(
  signal: string,
  resources: ShutdownResources,
): Promise<void> {
  if (shuttingDown) return;

  shuttingDown = true;
  logger.info(`\n${signal} received — shutting down gracefully...`);

  await new Promise<void>((resolve, reject) => {
    resources.server.close((err) => (err ? reject(err) : resolve()));
  });
  logger.info('HTTP server closed');

  await resources.worker.close();
  logger.info('Mail worker closed');

  await prisma.$disconnect();
  logger.info('Prisma disconnected');

  await resources.redis.quit();
  logger.info('Redis connections closed');

  logger.info('Shutdown complete');
  process.exit(0);
}

export function registerShutdownHandlers(resources: ShutdownResources): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, () => {
      void gracefulShutdown(signal, resources);
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000).unref();
    });
  }
}
