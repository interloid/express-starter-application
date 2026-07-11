/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
const randomUUID = jest.fn<() => string>();

const logger = {
  info: jest.fn(),
};

jest.unstable_mockModule('node:crypto', () => ({
  randomUUID,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger,
}));

const { correlationIdMiddleware, CORRELATION_ID_HEADER, REQUEST_ID_HEADER } =
  await import('./correlation-id.middleware.js');

describe('correlationIdMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    randomUUID
      .mockReturnValueOnce('generated-correlation-id')
      .mockReturnValueOnce('generated-request-id');
  });

  function createMockResponse() {
    const headers: Record<string, string> = {};

    let finishCallback: (() => void) | undefined;

    const res = {
      setHeader: jest.fn((key: string, value: string): void => {
        headers[key] = value;
      }),

      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }

        return res;
      }),

      statusCode: 200,

      triggerFinish: () => {
        finishCallback?.();
      },

      headers,
    };

    return res;
  }

  it('uses existing correlation and request ids from headers', () => {
    const req = {
      headers: {
        [CORRELATION_ID_HEADER]: 'existing-correlation',
        [REQUEST_ID_HEADER]: 'existing-request',
      },
      method: 'GET',
      originalUrl: '/users',
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = createMockResponse() as unknown as Response;

    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(randomUUID).not.toHaveBeenCalled();

    expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'existing-correlation');

    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'existing-request');

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates correlation and request ids when headers are missing', () => {
    const req = {
      headers: {},
      method: 'POST',
      originalUrl: '/login',
      ip: '127.0.0.1',
    } as Request;

    const res = createMockResponse() as unknown as Response;

    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(randomUUID).toHaveBeenCalledTimes(2);

    expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'generated-correlation-id');

    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'generated-request-id');

    expect(next).toHaveBeenCalled();
  });

  it('logs request details on response finish', () => {
    const req = {
      headers: {
        [CORRELATION_ID_HEADER]: 'correlation-id',
        [REQUEST_ID_HEADER]: 'request-id',
      },
      method: 'GET',
      originalUrl: '/health',
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = createMockResponse() as unknown as Response;

    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    res.statusCode = 201;

    (
      res as unknown as {
        triggerFinish: () => void;
      }
    ).triggerFinish();

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Request Id: request-id - GET /health 201'),
      expect.objectContaining({
        correlationId: 'correlation-id',
        requestId: 'request-id',
        statusCode: 201,
      }),
    );
  });
});
