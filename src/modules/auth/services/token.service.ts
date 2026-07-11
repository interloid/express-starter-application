import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../../config/env.config.js';
import { prisma } from '../../../lib/prisma.js';
import { UnauthorizedError } from '../../../common/error/http-errors.js';

export interface AccessPayload {
  sub: string;
  email: string;
}

interface TokenMeta {
  userAgent?: string;
  ipAddress?: string;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export async function issueTokens(
  userId: string,
  email: string,
  meta: TokenMeta = {},
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: userId, email });

  // Refresh token = random opaque value (not a JWT); we store its hash.
  const rawRefresh = randomBytes(48).toString('hex');
  const tokenHash = sha256(rawRefresh);

  const expiresAt = new Date();
  // crude TTL parse for '7d' / '15m' / '1h'
  expiresAt.setTime(expiresAt.getTime() + ttlToMs(env.JWT_REFRESH_TTL));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: rawRefresh };
}

/**
 * Rotate a refresh token. Detects reuse of a revoked token (revokes family).
 */
export async function rotateRefreshToken(
  rawRefresh: string,
  meta: TokenMeta = {},
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = sha256(rawRefresh);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Reuse detection: a revoked token being replayed = likely theft.
  if (stored.revokedAt) {
    await revokeAllForUser(stored.userId);
    throw new UnauthorizedError('Refresh token reuse detected — all sessions revoked');
  }

  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Re-check the user is still active before minting new tokens.
  const user = await prisma.user.findFirst({
    where: { id: stored.userId, deletedAt: null },
  });
  if (!user || user.status === false) {
    throw new UnauthorizedError('Account inactive');
  }

  // Revoke the old, issue a new pair.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(user.id, user.email, meta);
}

export async function revokeToken(rawRefresh: string): Promise<void> {
  const tokenHash = sha256(rawRefresh);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function ttlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  const units = ['s', 'h', 'd', 'm'] as const;
  type Unit = (typeof units)[number];

  if (!match) throw new Error(`Invalid TTL: ${ttl}`);

  const value = Number(match[1]);
  const unit = match[2] as Unit | undefined;

  const multipliers: Record<Unit, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  if (!unit) {
    throw new Error(`No unit provide for ttl`);
  } else if (!units.includes(unit)) {
    throw new Error(`Invalid unit for ttl ${unit}`);
  }
  return value * multipliers[unit];
}
