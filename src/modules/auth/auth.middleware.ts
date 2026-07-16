import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../common/error/http-errors.js';
import { verifyAccessToken } from './services/token.service.js';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.config.js';

async function resolvePermissions(userId: string): Promise<string[]> {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const perms = new Set<string>();
  for (const ur of roles) {
    for (const rp of ur.role.permissions) {
      perms.add(rp.permission.name); // "resource:action"
    }
  }
  return [...perms];
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;

    if (env.COOKIE_AUTH && req.cookies?.access_token) {
      token = req.cookies.access_token as string;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['access_token']) {
      token = Array.isArray(req.headers['access_token'])
        ? req.headers['access_token'][0]
        : req.headers['access_token'];
    }

    if (!token) throw new UnauthorizedError('Authentication token missing');

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user || user.status === false) {
      throw new UnauthorizedError('Account inactive');
    }

    const permissions = await resolvePermissions(user.id);
    req.user = { id: user.id, email: user.email, permissions };
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requirePermission =
  (required: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const [resource, action] = required.split(':');
    const perms = req.user.permissions;

    const hasExact = perms.includes(required);
    const hasManage = action !== 'manage' && perms.includes(`${resource}:manage`);

    if (hasExact || hasManage) {
      return next();
    }
    next(new ForbiddenError(`Missing permission: ${required}`));
  };
