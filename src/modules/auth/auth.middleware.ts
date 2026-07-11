import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../common/error/http-errors.js';
import { verifyAccessToken } from './services/token.service.js';
import { prisma } from '../../lib/prisma.js';

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
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token;
    const headerToken = req.headers['access_token'] as string | undefined;
    const token = cookieToken ?? headerToken;

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
