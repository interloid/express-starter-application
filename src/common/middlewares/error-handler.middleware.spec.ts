/* eslint-disable @typescript-eslint/unbound-method */
import type { NextFunction, Request, Response } from 'express';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { z } from 'zod';

import { HttpError } from '../../../src/common/error/http-errors.js';
import { logger } from '../../../src/utils/logger.js';
import { globalErrorHandler, notFoundHandler } from './error-handler.middleware.js';

describe('globalErrorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
      method: 'GET',
    } as Request;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle Zod validation errors', () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const result = schema.safeParse({
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    globalErrorHandler(result.error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        path: '/api/test',
        errors: [
          {
            field: 'email',
            message: expect.any(String),
          },
        ],
      }),
    );
  });

  it('should handle HttpError', () => {
    const error = new HttpError(401, 'Unauthorized', [
      {
        field: 'token',
        message: 'Invalid token',
      },
    ]);

    globalErrorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 401,
        message: 'Unauthorized',
        errors: [
          {
            field: 'token',
            message: 'Invalid token',
          },
        ],
      }),
    );
  });

  it('should handle normal Error and log it', () => {
    const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    const error = new Error('Something went wrong');

    globalErrorHandler(error, req, res, next);

    expect(loggerSpy).toHaveBeenCalledWith('Unhandled error: Something went wrong', {
      stack: error.stack,
    });

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('should handle unknown non Error values', () => {
    globalErrorHandler('unexpected value', req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });
});

describe('notFoundHandler', () => {
  it('should return 404 response', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/not-exist',
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Route not found: POST /api/not-exist',
        path: '/api/not-exist',
      }),
    );
  });
});
