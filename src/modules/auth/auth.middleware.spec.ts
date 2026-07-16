import { jest } from '@jest/globals';
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockVerifyAccessToken = jest.fn();
jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: mockFindFirst,
    },
    userRole: {
      findMany: mockFindMany,
    },
  },
}));

jest.unstable_mockModule('./services/token.service.js', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

const { requireAuth, requirePermission } = await import('./auth.middleware.js');

import type { Request, Response } from 'express';

import { ForbiddenError, UnauthorizedError } from '../../common/error/http-errors.js';
import { env } from '../../config/env.config.js';

describe('auth.middleware', () => {
  let req: Request;
  let res: Response;
  let next: jest.Mock;
  beforeEach(() => {
    jest.resetAllMocks();

    req = {
      cookies: {},
      headers: {},
    } as Request;

    res = {} as Response;
    env.COOKIE_AUTH = true;
    next = jest.fn();
  });

  describe('requireAuth', () => {
    it('should throw unauthorized when token missing', async () => {
      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should authenticate user using cookie token', async () => {
      req.cookies = {
        access_token: 'cookie-token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
        email: 'test@test.com',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: true,
      } as never);

      mockFindMany.mockResolvedValue([
        {
          role: {
            permissions: [
              {
                permission: {
                  name: 'user:read',
                },
              },
            ],
          },
        },
      ] as never);

      await requireAuth(req, res, next);

      expect(req.user).toEqual({
        id: 'user-id',
        email: 'test@test.com',
        permissions: ['user:read'],
      });

      expect(next).toHaveBeenCalledWith();
    });

    it('should authenticate using bearer token', async () => {
      req.headers = {
        authorization: 'Bearer bearer-token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
        email: 'test@test.com',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: true,
      } as never);

      await requireAuth(req, res, next);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('bearer-token');
    });

    it('should authenticate using access_token header', async () => {
      req.headers = {
        access_token: 'header-token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
        email: 'test@test.com',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: true,
      } as never);

      await requireAuth(req, res, next);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('header-token');
    });

    it('should use first access_token when header is an array', async () => {
      req.headers = {
        access_token: ['token-1', 'token-2'],
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
        email: 'test@test.com',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: true,
      } as never);

      await requireAuth(req, res, next);

      expect(mockVerifyAccessToken).toHaveBeenCalledWith('token-1');
    });

    it('should reject when user does not exist', async () => {
      req.headers = {
        access_token: 'token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
      });

      mockFindFirst.mockResolvedValue(null as never);

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      // expect(next.mock.calls[0][0]?.message).toBe('Account inactive');
    });
    it('should reject inactive user', async () => {
      req.cookies = {
        access_token: 'token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: false,
      } as never);

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should reject invalid token', async () => {
      req.cookies = {
        access_token: 'bad-token',
      };

      mockVerifyAccessToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should pass existing UnauthorizedError', async () => {
      req.cookies = {
        access_token: 'token',
      };

      const error = new UnauthorizedError('custom');

      mockVerifyAccessToken.mockImplementation(() => {
        throw error;
      });

      await requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('requirePermission', () => {
    it('should reject when user is missing', () => {
      const middleware = requirePermission('user:create');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should authenticate with no permissions', async () => {
      req.headers = {
        access_token: 'token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
        email: 'test@test.com',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: true,
      } as never);

      await requireAuth(req, res, next);

      expect(req.user?.permissions).toEqual(undefined);
    });
    it('should remove duplicate permissions', async () => {
      req.headers = {
        access_token: 'token',
      };

      mockVerifyAccessToken.mockReturnValue({
        sub: 'user-id',
        email: 'test@test.com',
      });

      mockFindFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: true,
      } as never);

      mockFindMany.mockResolvedValue([
        {
          role: {
            permissions: [
              {
                permission: {
                  name: 'user:create',
                },
              },
            ],
          },
        },
        {
          role: {
            permissions: [
              {
                permission: {
                  name: 'user:create',
                },
              },
            ],
          },
        },
      ] as never);

      await requireAuth(req, res, next);

      expect(req.user?.permissions).toEqual(['user:create']);
    });
    it('should allow exact permission', () => {
      req.user = {
        id: 'user-id',
        email: 'test@test.com',
        permissions: ['user:create'],
      };

      const middleware = requirePermission('user:create');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow manage permission', () => {
      req.user = {
        id: 'user-id',
        email: 'test@test.com',
        permissions: ['user:manage'],
      };

      const middleware = requirePermission('user:create');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny missing permission', () => {
      req.user = {
        id: 'user-id',
        email: 'test@test.com',
        permissions: ['post:read'],
      };

      const middleware = requirePermission('user:create');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should not use manage permission when checking manage itself', () => {
      req.user = {
        id: 'user-id',
        email: 'test@test.com',
        permissions: ['user:create'],
      };

      const middleware = requirePermission('user:manage');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
  it('should resolve user permissions from roles', async () => {
    req.cookies = {
      access_token: 'valid-token',
    };

    mockVerifyAccessToken.mockReturnValue({
      sub: 'user-id',
      email: 'test@test.com',
    });

    mockFindFirst.mockResolvedValue({
      id: 'user-id',
      email: 'test@test.com',
      status: true,
    } as never);

    mockFindMany.mockResolvedValue([
      {
        role: {
          permissions: [
            {
              permission: {
                name: 'user:create',
              },
            },
            {
              permission: {
                name: 'user:update',
              },
            },
          ],
        },
      },
    ] as never);

    await requireAuth(req, res, next);

    expect(req.user).toEqual({
      id: 'user-id',
      email: 'test@test.com',
      permissions: ['user:create', 'user:update'],
    });

    expect(next).toHaveBeenCalledWith();
  });
});
