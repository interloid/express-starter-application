import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestError, UnauthorizedError } from '../../../common/error/http-errors.js';

const randomBytes = jest.fn<(size: number) => { toString: (encoding: string) => string }>();

const update = jest.fn<
  (data: string) => {
    digest: (encoding: string) => string;
  }
>();

const digest = jest.fn<(encoding: string) => string>();

const createHash = jest.fn(() => ({
  update,
  digest,
}));

const prisma = {
  verificationToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('node:crypto', () => ({
  randomBytes,
  createHash,
}));

jest.unstable_mockModule('../../../lib/prisma.js', () => ({
  prisma,
}));

const { createVerificationToken, consumeVerificationToken } =
  await import('./verification-token.service.js');

describe('verification-token.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    randomBytes.mockReturnValue({
      toString: () => 'raw-token',
    });

    update.mockReturnValue({
      digest,
    });

    digest.mockReturnValue('hashed-token');
  });

  describe('createVerificationToken', () => {
    it('creates verification token', async () => {
      prisma.verificationToken.create.mockResolvedValue(undefined as never);

      const token = await createVerificationToken('user-id', 'EMAIL_VERIFICATION', 1000);

      expect(randomBytes).toHaveBeenCalledWith(32);

      expect(update).toHaveBeenCalledWith('raw-token');

      expect(digest).toHaveBeenCalledWith('hex');

      expect(prisma.verificationToken.create).toHaveBeenCalledTimes(1);

      expect(prisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          tokenHash: 'hashed-token',
          type: 'EMAIL_VERIFICATION',
          expiresAt: expect.any(Date),
        }),
      });

      expect(token).toBe('raw-token');
    });
  });

  describe('consumeVerificationToken', () => {
    it('throws BadRequestError when token is missing', async () => {
      prisma.verificationToken.findFirst.mockResolvedValue(null as never);

      await expect(
        consumeVerificationToken('raw-token', 'EMAIL_VERIFICATION'),
      ).rejects.toBeInstanceOf(BadRequestError);

      expect(prisma.verificationToken.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedError when token is expired', async () => {
      prisma.verificationToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      await expect(
        consumeVerificationToken('raw-token', 'EMAIL_VERIFICATION'),
      ).rejects.toBeInstanceOf(UnauthorizedError);

      expect(prisma.verificationToken.update).not.toHaveBeenCalled();
    });

    it('consumes token successfully', async () => {
      prisma.verificationToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 100000),
      } as never);

      prisma.verificationToken.update.mockResolvedValue(undefined as never);

      const userId = await consumeVerificationToken('raw-token', 'EMAIL_VERIFICATION');

      expect(prisma.verificationToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: 'hashed-token',
          type: 'EMAIL_VERIFICATION',
          usedAt: null,
        },
      });

      expect(prisma.verificationToken.update).toHaveBeenCalledWith({
        where: {
          id: 'token-id',
        },
        data: {
          usedAt: expect.any(Date),
        },
      });

      expect(userId).toBe('user-id');
    });
  });
});
