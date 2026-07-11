import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createHealthService } from './health.service.js';

describe('HealthService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();

    delete process.env.GIT_COMMIT;
    delete process.env.BUILD_TIME;
  });

  function mockMemoryUsage(heapUsed: number, rss: number): void {
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed,
      rss,
      heapTotal: heapUsed,
      external: 0,
      arrayBuffers: 0,
    });
  }

  it('returns liveness status', () => {
    const service = createHealthService();

    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('returns readiness healthy when memory is within limits', () => {
    mockMemoryUsage(100 * 1024 * 1024, 200 * 1024 * 1024);

    process.env.GIT_COMMIT = 'abc123';
    process.env.BUILD_TIME = '2026-07-11T12:00:00Z';

    const service = createHealthService();

    const result = service.getReadiness();

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
      },
      version: {
        commitId: 'abc123',
        buildTime: '2026-07-11T12:00:00Z',
      },
    });
  });

  it('returns readiness down when heap exceeds limit', () => {
    mockMemoryUsage(301 * 1024 * 1024, 200 * 1024 * 1024);

    const service = createHealthService();

    const result = service.getReadiness();

    expect(result.healthy).toBe(false);

    expect(result.body.status).toBe('down');

    expect(result.body.info.memory_heap).toEqual({
      status: 'down',
      used: '301MB',
      limit: '300MB',
    });

    expect(result.body.info.memory_rss.status).toBe('up');
  });

  it('returns readiness down when rss exceeds limit', () => {
    mockMemoryUsage(100 * 1024 * 1024, 501 * 1024 * 1024);

    const service = createHealthService();

    const result = service.getReadiness();

    expect(result.healthy).toBe(false);

    expect(result.body.status).toBe('down');

    expect(result.body.info.memory_heap.status).toBe('up');

    expect(result.body.info.memory_rss).toEqual({
      status: 'down',
      used: '501MB',
      limit: '500MB',
    });
  });

  it('returns unknown version when env values are missing', () => {
    mockMemoryUsage(100 * 1024 * 1024, 200 * 1024 * 1024);

    const service = createHealthService();

    const result = service.getReadiness();

    expect(result.body.version).toEqual({
      commitId: 'unknown',
      buildTime: 'unknown',
    });
  });
});
