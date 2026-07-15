import { randomBytes, createHash } from 'node:crypto';
import type { TokenType } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { BadRequestError, UnauthorizedError } from '../../../common/error/http-errors.js';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function createVerificationToken(
  userId: string,
  type: TokenType, // 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
  ttlMs: number,
): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.verificationToken.create({
    data: { userId, tokenHash, type, expiresAt },
  });

  return rawToken;
}

export async function consumeVerificationToken(rawToken: string, type: TokenType): Promise<string> {
  const tokenHash = sha256(rawToken);
  const record = await prisma.verificationToken.findFirst({
    where: { tokenHash, type, usedAt: null },
  });

  if (!record) throw new BadRequestError('Invalid or used token');
  if (record.expiresAt < new Date()) throw new UnauthorizedError('Token expired');

  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
