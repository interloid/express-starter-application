import type { NextFunction, Request, Response } from 'express';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import { validate } from './validate.middleware.js';

describe('validate middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      validated: {},
    } as Request;

    res = {} as Response;

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate body successfully and update req.body', () => {
    const middleware = validate({
      body: z.object({
        name: z.string(),
      }),
    });

    req.body = {
      name: 'Navaneethan',
    };

    middleware(req, res, next);

    expect(req.body).toEqual({
      name: 'Navaneethan',
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with ZodError when body validation fails', () => {
    const middleware = validate({
      body: z.object({
        name: z.string(),
      }),
    });

    req.body = {
      name: 123,
    };

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    const error = jest.mocked(next).mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(z.ZodError);
  });

  it('should validate query successfully and update req.query', () => {
    const middleware = validate({
      query: z.object({
        page: z.string(),
      }),
    });

    req.query = {
      page: '1',
    };

    middleware(req, res, next);
    expect(req.validated).toEqual({
      query: {
        page: '1',
      },
    });

    expect(req.query).toEqual({
      page: '1',
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with ZodError when query validation fails', () => {
    const schema = z.object({
      page: z.coerce.number().min(1),
    });

    const middleware = validate({
      query: schema,
    });

    const req = {
      query: {
        page: 'invalid',
      },
    } as unknown as Request;

    const next = jest.fn();

    middleware(req, {} as Response, next);

    const error = next.mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(z.ZodError);
  });

  it('should validate params successfully and update req.params', () => {
    const middleware = validate({
      params: z.object({
        id: z.string(),
      }),
    });

    req.params = {
      id: '123',
    };

    middleware(req, res, next);
    expect(req.validated).toEqual({
      params: {
        id: '123',
      },
    });
    expect(req.params).toEqual({
      id: '123',
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with ZodError when query validation fails', () => {
    const middleware = validate({
      query: z.object({
        page: z.string(),
      }),
    });

    req.query = {
      page: 123 as unknown as string,
    };

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    const error = jest.mocked(next).mock.calls[0]?.[0];

    expect(error).toBeInstanceOf(z.ZodError);
  });

  it('should preserve validated query when params are validated', () => {
    const middleware = validate({
      query: z.object({
        page: z.coerce.number(),
      }),
      params: z.object({
        id: z.string(),
      }),
    });

    req.query = {
      page: '2',
    };

    req.params = {
      id: '123',
    };

    middleware(req, res, next);

    expect(req.validated).toEqual({
      query: {
        page: 2,
      },
      params: {
        id: '123',
      },
    });

    expect(next).toHaveBeenCalledWith();
  });
  it('should call next when no schemas are provided', () => {
    const middleware = validate({});

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
