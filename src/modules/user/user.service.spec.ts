/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError } from '../../common/error/http-errors.js';
import { env } from '../../config/env.config.js';

const prisma = {
  user: {
    findUnique: jest.fn<() => Promise<unknown | null>>(),
    create: jest.fn<() => Promise<unknown>>(),
  },
  role: {
    findUnique: jest.fn<() => Promise<unknown | null>>(),
  },
};

const hashPassword = jest.fn<(password: string) => Promise<string>>();
const createVerificationToken = jest.fn();
const enqueueVerificationEmail = jest.fn();

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma,
}));

jest.unstable_mockModule('../auth/services/password.service.js', () => ({
  hashPassword,
}));

jest.unstable_mockModule('../auth/services/verification-token.service.js', () => ({
  createVerificationToken,
}));

jest.unstable_mockModule('../queue/mail.producer.js', () => ({
  enqueueVerificationEmail,
}));

const { registerUser } = await import('./user.service.js');

describe('registerUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const input = {
    email: 'TEST@Example.COM',
    password: 'Password@123',
    firstName: 'Navaneethan',
    lastName: 'R',
  };

  it('throws ConflictError when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
    });

    await expect(registerUser(input)).rejects.toBeInstanceOf(ConflictError);

    // expect(prisma.user.findUnique).toHaveBeenCalledWith();

    expect(prisma.role.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('throws when default role is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(registerUser(input)).rejects.toThrow('Default role missing — run the seed');

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('registers user and sends verification email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    prisma.role.findUnique.mockResolvedValue({
      id: 'role-id',
      firstName: 'user',
    });

    hashPassword.mockResolvedValue('hashed-password');

    prisma.user.create.mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
    });

    createVerificationToken.mockResolvedValue('raw-token' as never);

    enqueueVerificationEmail.mockResolvedValue(undefined as never);

    const result = await registerUser(input);

    expect(hashPassword).toHaveBeenCalledWith('Password@123');

    expect(createVerificationToken).toHaveBeenCalledWith(
      'user-id',
      'EMAIL_VERIFICATION',
      24 * 60 * 60 * 1000,
    );

    expect(enqueueVerificationEmail).toHaveBeenCalledWith(
      'test@example.com',
      `${env.FRONTEND_URL}/verify-email?token=raw-token`,
    );

    expect(result).toEqual({
      id: 'user-id',
      email: 'test@example.com',
    });
  });
});
