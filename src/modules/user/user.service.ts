import { hashPassword } from '../auth/services/password.service.js';
import { createVerificationToken } from '../auth/services/verification-token.service.js';
import { prisma } from '../../lib/prisma.js';
import type { RegisterDto } from '../auth/auth.schema.js';
import { env } from '../../config/env.config.js';
import { ConflictError } from '../../common/error/http-errors.js';
import { enqueueVerificationEmail } from '../queue/mail.producer.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export async function registerUser(input: RegisterDto) {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');

  const role = await prisma.role.findUnique({ where: { name: 'user' } });
  if (!role) throw new Error('Default role missing — run the seed');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      roles: { create: { roleId: role.id } },
    },
  });

  const rawToken = await createVerificationToken(user.id, 'EMAIL_VERIFICATION', VERIFY_TTL_MS);
  const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  await enqueueVerificationEmail(user.email, verificationLink);

  return { id: user.id, email: user.email };
}
