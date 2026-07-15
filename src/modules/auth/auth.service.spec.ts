import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma as actualPrisma } from '../../lib/prisma.js';
import type { TokenType, User } from '@prisma/client';

const prisma = {
  user: {
    findFirst: jest.fn<typeof actualPrisma.user.findFirst>(),
    update: jest.fn<typeof actualPrisma.user.update>(),
  },
};
const registerUser = jest.fn();
const hashPassword = jest.fn<(password: string) => Promise<string>>();
const verifyPassword = jest.fn<(passwordHash: string, password: string) => Promise<boolean>>();
const issueTokens = jest.fn();
const revokeAllForUser = jest.fn<(userId: string) => Promise<void>>();
const revokeToken = jest.fn();
const rotateRefreshToken = jest.fn();

const createVerificationToken =
  jest.fn<(userId: string, type: TokenType, ttlMs: number) => Promise<string>>();

const consumeVerificationToken = jest.fn<(rawToken: string, type: TokenType) => Promise<string>>();

const enqueuePasswordResetEmail = jest.fn<(email: string, resetLink: string) => Promise<void>>();
jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma,
}));

jest.unstable_mockModule('../user/user.service.js', () => ({
  registerUser,
}));

jest.unstable_mockModule('./services/password.service.js', () => ({
  hashPassword,
  verifyPassword,
}));

jest.unstable_mockModule('./services/token.service.js', () => ({
  issueTokens,
  revokeAllForUser,
  revokeToken,
  rotateRefreshToken,
}));

jest.unstable_mockModule('./services/verification-token.service.js', () => ({
  consumeVerificationToken,
  createVerificationToken,
}));

jest.unstable_mockModule('../queue/mail.producer.js', () => ({
  enqueuePasswordResetEmail,
}));

const {
  registerService,
  loginService,
  refreshTokenService,
  logoutService,
  logoutAllService,
  verifyEmailService,
  forgotPassword,
  resetPassword,
} = await import('./auth.service.js');

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-id',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: false,
  passwordHash: 'hashed-password',
  firstName: null,
  lastName: null,
  avatarUrl: null,
  status: true,
  lastLoginAt: null,
  deletedAt: null,
  ...overrides,
});
describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registerService calls registerUser', async () => {
    const data = {
      email: 'test@example.com',
      password: 'Password@123',
    };

    registerUser.mockResolvedValue({
      id: 'user-id',
    } as never);

    const result = await registerService(data);

    expect(registerUser).toHaveBeenCalledWith(data);

    expect(result).toEqual({
      id: 'user-id',
    });
  });

  describe('loginService', () => {
    it('throws when user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(loginService('TEST@EXAMPLE.COM', 'password')).rejects.toThrow(
        'Invalid credentials',
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          deletedAt: null,
        },
      });
    });

    it('throws when user inactive', async () => {
      prisma.user.findFirst.mockResolvedValue(
        mockUser({
          id: 'user-id',
          email: 'test@example.com',
          passwordHash: 'hash',
          status: false,
        }),
      );

      await expect(loginService('test@example.com', 'password')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('throws when password invalid', async () => {
      prisma.user.findFirst.mockResolvedValue(
        mockUser({
          id: 'user-id',
          email: 'test@example.com',
          passwordHash: 'hash',
          status: true,
        }),
      );

      verifyPassword.mockResolvedValue(false);

      await expect(loginService('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('returns user and tokens on login success', async () => {
      prisma.user.findFirst.mockResolvedValue(
        mockUser({
          id: 'user-id',
          email: 'test@example.com',
          passwordHash: 'hash',
          status: true,
        }),
      );

      verifyPassword.mockResolvedValue(true);

      issueTokens.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      } as never);

      const result = await loginService('TEST@example.com', 'password', {
        userAgent: 'chrome',
      });

      expect(result).toEqual({
        user: {
          id: 'user-id',
          email: 'test@example.com',
        },
        accessToken: 'access',
        refreshToken: 'refresh',
      });
    });
  });

  it('refreshTokenService calls rotateRefreshToken', async () => {
    rotateRefreshToken.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
    } as never);

    await refreshTokenService('refresh');

    expect(rotateRefreshToken).toHaveBeenCalledWith('refresh', {});
  });

  it('logoutService revokes token', async () => {
    revokeToken.mockResolvedValue(undefined as never);

    await logoutService('refresh');

    expect(revokeToken).toHaveBeenCalledWith('refresh');
  });

  it('logoutAllService revokes all sessions', async () => {
    revokeAllForUser.mockResolvedValue(undefined);

    await logoutAllService('user-id');

    expect(revokeAllForUser).toHaveBeenCalledWith('user-id');
  });

  it('verifies email', async () => {
    consumeVerificationToken.mockResolvedValue('user-id');

    prisma.user.update.mockResolvedValue(undefined as never);

    await verifyEmailService('token');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-id',
      },
      data: {
        emailVerified: true,
        status: true,
      },
    });
  });

  describe('forgotPassword', () => {
    it('does nothing when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await forgotPassword('TEST@example.com');

      expect(createVerificationToken).not.toHaveBeenCalled();
    });

    it('creates reset token and sends email', async () => {
      prisma.user.findFirst.mockResolvedValue(
        mockUser({
          id: 'user-id',
          email: 'test@example.com',
        }),
      );

      createVerificationToken.mockResolvedValue('reset-token');

      enqueuePasswordResetEmail.mockResolvedValue(undefined);

      await forgotPassword('TEST@example.com');

      expect(createVerificationToken).toHaveBeenCalled();

      expect(enqueuePasswordResetEmail).toHaveBeenCalled();
    });
  });

  it('resets password', async () => {
    consumeVerificationToken.mockResolvedValue('user-id');

    hashPassword.mockResolvedValue('new-hash');

    prisma.user.update.mockResolvedValue(mockUser());

    revokeAllForUser.mockResolvedValue(undefined);

    await resetPassword('token', 'new-password');

    expect(hashPassword).toHaveBeenCalledWith('new-password');

    expect(revokeAllForUser).toHaveBeenCalledWith('user-id');
  });
});
