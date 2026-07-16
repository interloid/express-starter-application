import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockQueryRaw = jest.fn<() => Promise<unknown>>();
const mockPing = jest.fn<() => Promise<string>>();
jest.unstable_mockModule('../../../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

jest.unstable_mockModule('../../../lib/redis.js', () => ({
  redisClient: {
    ping: mockPing,
  },
}));

jest.unstable_mockModule('../../../config/env.config.js', () => ({
  env: {
    GIT_COMMIT: 'abc123',
    BUILD_TIME: '2026-07-11T12:00:00Z',
  },
}));

const { createHealthService } = await import('./health.service.js');

describe('HealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    mockQueryRaw.mockResolvedValue(undefined);
    mockPing.mockResolvedValue('PONG');
  });

  function mockMemoryUsage(heapUsed: number, rss: number): void {
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss,
      heapTotal: heapUsed,
      heapUsed,
      external: 0,
      arrayBuffers: 0,
    });
  }

  it('should return liveness', () => {
    const service = createHealthService();

    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
  });

  it('should return readiness when everything is healthy', async () => {
    mockMemoryUsage(100 * 1024 * 1024, 200 * 1024 * 1024);

    const service = createHealthService();

    const result = await service.getReadiness();

    expect(result.healthy).toBe(true);

    expect(result.body).toMatchObject({
      status: 'up',
      info: {
        memory_heap: {
          status: 'up',
          used: '100MB',
          limit: '300MB',
        },
        memory_rss: {
          status: 'up',
          used: '200MB',
          limit: '500MB',
        },
        database: {
          status: 'up',
        },
        redis: {
          status: 'up',
        },
      },
      version: {
        commitId: 'abc123',
        buildTime: '2026-07-11T12:00:00Z',
      },
    });
  });

  it('should return down when heap exceeds limit', async () => {
    mockMemoryUsage(301 * 1024 * 1024, 200 * 1024 * 1024);

    const service = createHealthService();

    const result = await service.getReadiness();

    expect(result.healthy).toBe(false);

    expect(result.body.info.memory_heap).toEqual({
      status: 'down',
      used: '301MB',
      limit: '300MB',
    });
  });

  it('should return down when rss exceeds limit', async () => {
    mockMemoryUsage(100 * 1024 * 1024, 501 * 1024 * 1024);

    const service = createHealthService();

    const result = await service.getReadiness();

    expect(result.healthy).toBe(false);

    expect(result.body.info.memory_rss).toEqual({
      status: 'down',
      used: '501MB',
      limit: '500MB',
    });
  });

  it('should return database down when query fails', async () => {
    mockMemoryUsage(100 * 1024 * 1024, 200 * 1024 * 1024);

    mockQueryRaw.mockRejectedValue(new Error());

    const service = createHealthService();

    const result = await service.getReadiness();

    expect(result.healthy).toBe(false);

    expect(result.body.info.database).toEqual({
      status: 'down',
    });
  });

  it('should return redis down when ping fails', async () => {
    mockMemoryUsage(100 * 1024 * 1024, 200 * 1024 * 1024);

    mockPing.mockRejectedValue(new Error());

    const service = createHealthService();

    const result = await service.getReadiness();

    expect(result.healthy).toBe(false);

    expect(result.body.info.redis).toEqual({
      status: 'down',
    });
  });
});
