import { NotFoundError, UnauthorizedError } from '../../common/error/http-errors.js';
import { env } from '../../config/env.config.js';
import { prisma } from '../../lib/prisma.js';
import { enqueuePasswordResetEmail } from '../queue/mail.producer.js';
import { registerUser } from '../user/user.service.js';
import type { RegisterDto } from './auth.schema.js';
import { hashPassword, verifyPassword } from './services/password.service.js';
import {
  issueTokens,
  revokeAllForUser,
  revokeToken,
  rotateRefreshToken,
} from './services/token.service.js';
import {
  consumeVerificationToken,
  createVerificationToken,
} from './services/verification-token.service.js';

interface LoginMeta {
  userAgent?: string;
  ipAddress?: string;
}
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function registerService(data: RegisterDto) {
  return await registerUser(data);
}

export async function loginService(email: string, password: string, meta: LoginMeta = {}) {
  console.log(email, password);

  const normalized = email.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: { email: normalized, deletedAt: null },
  });

  if (!user || user.status === false) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  const tokens = await issueTokens(user.id, user.email, meta);
  return { user: { id: user.id, email: user.email }, ...tokens };
}

export async function refreshTokenService(rawRefreshToken: string, meta: LoginMeta = {}) {
  return rotateRefreshToken(rawRefreshToken, meta);
}

export async function logoutService(rawRefreshToken: string) {
  await revokeToken(rawRefreshToken);
}

export async function logoutAllService(userId: string) {
  await revokeAllForUser(userId);
}

export async function verifyEmailService(rawToken: string): Promise<void> {
  const userId = await consumeVerificationToken(rawToken, 'EMAIL_VERIFICATION');
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, status: true },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { email: normalized, deletedAt: null },
  });

  if (!user) throw new NotFoundError('Email not exists');

  const rawToken = await createVerificationToken(user.id, 'PASSWORD_RESET', RESET_TTL_MS);
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  await enqueuePasswordResetEmail(user.email, resetLink);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const userId = await consumeVerificationToken(rawToken, 'PASSWORD_RESET');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await revokeAllForUser(userId);
}
