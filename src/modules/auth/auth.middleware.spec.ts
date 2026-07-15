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

import { UnauthorizedError, ForbiddenError } from '../../common/error/http-errors.js';

describe('auth.middleware', () => {
  let req: Request;
  let res: Response;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      cookies: {},
      headers: {},
    } as Request;

    res = {} as Response;

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

      expect(next).toHaveBeenCalledWith();
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
