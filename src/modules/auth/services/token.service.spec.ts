import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const jwtSign = jest.fn<(payload: unknown, secret: string, options: unknown) => string>();
const jwtVerify = jest.fn<(token: string, secret: string) => unknown>();

const randomBytes = jest.fn<(size: number) => { toString: (encoding: string) => string }>();

const createHash = jest.fn();

const prisma = {
  refreshToken: {
    create: jest.fn<() => Promise<void>>(),
    findUnique: jest.fn(),
    update: jest.fn<() => Promise<void>>(),
    updateMany: jest.fn<() => Promise<void>>(),
  },
  user: {
    findFirst: jest.fn(),
  },
};

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jwtSign,
    verify: jwtVerify,
  },
}));

jest.unstable_mockModule('node:crypto', () => ({
  randomBytes,
  createHash,
}));

jest.unstable_mockModule('../../../lib/prisma.js', () => ({
  prisma,
}));

const {
  issueTokens,
  rotateRefreshToken,
  revokeToken,
  revokeAllForUser,
  verifyAccessToken,
  ttlToMs,
} = await import('./token.service.js');

describe('token.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    randomBytes.mockReturnValue({
      toString: () => 'refresh-token',
    });

    createHash.mockReturnValue({
      update: () => ({
        digest: () => 'hashed-token',
      }),
    });
  });

  describe('ttlToMs', () => {
    it('converts seconds', () => {
      expect(ttlToMs('10s')).toBe(10000);
    });

    it('converts minutes', () => {
      expect(ttlToMs('2m')).toBe(120000);
    });

    it('converts hours', () => {
      expect(ttlToMs('1h')).toBe(3600000);
    });

    it('converts days', () => {
      expect(ttlToMs('1d')).toBe(86400000);
    });

    it('throws invalid ttl', () => {
      expect(() => ttlToMs('abc')).toThrow('Invalid TTL: abc');
    });

    it('throws invalid unit', () => {
      expect(() => ttlToMs('10x')).toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies access token', () => {
      jwtVerify.mockReturnValue({
        sub: 'user-id',
        email: 'test@example.com',
      });

      const result = verifyAccessToken('token');

      expect(jwtVerify).toHaveBeenCalled();

      expect(result).toEqual({
        sub: 'user-id',
        email: 'test@example.com',
      });
    });
  });

  describe('issueTokens', () => {
    it('creates access and refresh tokens', async () => {
      jwtSign.mockReturnValue('access-token');

      prisma.refreshToken.create.mockResolvedValue();

      const result = await issueTokens('user-id', 'test@example.com', {
        userAgent: 'chrome',
        ipAddress: '127.0.0.1',
      });

      expect(jwtSign).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('rotateRefreshToken', () => {
    it('throws when refresh token does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null as never);

      await expect(rotateRefreshToken('refresh')).rejects.toThrow('Invalid refresh token');
    });

    it('revokes all sessions when token reused', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      } as never);

      prisma.refreshToken.updateMany.mockResolvedValue();

      await expect(rotateRefreshToken('refresh')).rejects.toThrow('Refresh token reuse detected');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('throws when refresh token expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      await expect(rotateRefreshToken('refresh')).rejects.toThrow('Refresh token expired');
    });

    it('throws when user inactive', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      } as never);

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        status: false,
      } as never);

      await expect(rotateRefreshToken('refresh')).rejects.toThrow('Account inactive');
    });

    it('rotates refresh token successfully', async () => {
      jwtSign.mockReturnValue('new-access');

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'old-token',
        userId: 'user-id',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      } as never);

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        status: true,
      } as never);

      prisma.refreshToken.update.mockResolvedValue();

      prisma.refreshToken.create.mockResolvedValue();

      const result = await rotateRefreshToken('refresh');

      expect(prisma.refreshToken.update).toHaveBeenCalled();

      expect(result.accessToken).toBe('new-access');
    });
  });

  describe('revoke functions', () => {
    it('revokes one token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue();

      await revokeToken('refresh');
    });

    it('revokes all user tokens', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue();

      await revokeAllForUser('user-id');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
