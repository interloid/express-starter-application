import { env } from '../../../config/env.config.js';
import { prisma } from '../../../lib/prisma.js';
import { redisClient } from '../../../lib/redis.js';

const HEAP_LIMIT_BYTES = 300 * 1024 * 1024; // 300 MB
const RSS_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const toMB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

export function createHealthService() {
  function checkHeap() {
    const { heapUsed } = process.memoryUsage();
    return {
      status: heapUsed < HEAP_LIMIT_BYTES ? 'up' : 'down',
      used: toMB(heapUsed),
      limit: toMB(HEAP_LIMIT_BYTES),
    };
  }

  function checkRss() {
    const { rss } = process.memoryUsage();
    return {
      status: rss < RSS_LIMIT_BYTES ? 'up' : 'down',
      used: toMB(rss),
      limit: toMB(RSS_LIMIT_BYTES),
    };
  }
  async function checkDb() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  async function checkRedis() {
    try {
      await redisClient.ping();
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  function versionInfo() {
    return {
      commitId: env.GIT_COMMIT ?? 'unknown',
      buildTime: env.BUILD_TIME ?? 'unknown',
    };
  }

  function getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async function getReadiness() {
    const info = {
      memory_heap: checkHeap(),
      memory_rss: checkRss(),
      database: await checkDb(),
      redis: await checkRedis(),
    };

    const healthy = Object.values(info).every((c) => c.status === 'up');

    return {
      healthy,
      body: {
        status: healthy ? 'up' : 'down',
        info,
        version: versionInfo(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  return { getLiveness, getReadiness };
}

export type HealthService = ReturnType<typeof createHealthService>;
