import { doubleCsrf } from 'csrf-csrf';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { registerCsrfDocs } from './csrf.docs.js';
import { HttpError } from '../common/error/http-errors.js';
import { env } from '../config/env.config.js';

interface CsrfConfig {
  enabled: boolean;
  secret: string;
  isProduction: boolean;
}

export interface CsrfInterface {
  enabled: boolean;
  protection: RequestHandler;
  generateToken: (req: Request, res: Response) => string;
}
const CSRF_EXEMPT_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/refresh',
  '/api/v1/auth/verify-mail',
  '/api/v1/aiuthreset-password',
];

export function createCsrf({ enabled, secret, isProduction }: CsrfConfig): CsrfInterface {
  if (!enabled) {
    const passthrough: RequestHandler = (_req, _res, next) => next();
    return {
      enabled: false,
      protection: passthrough,
      generateToken: () => '',
    };
  }

  if (!secret) {
    throw new Error('CSRF is enabled but CSRF_SECRET is not set');
  }

  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => secret,
    getSessionIdentifier: (req: Request) => {
      if (req.user?.id) {
        return req.user.id;
      }

      if (req.ip) {
        return req.ip;
      }

      return 'anonymous-session';
    },
    cookieName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
    },
    getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'],
  });
  registerCsrfDocs();
  return {
    enabled: true,
    protection: doubleCsrfProtection,
    generateToken: generateCsrfToken,
  };
}

export function createCsrfProtection(csrfMiddleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const isExempt = CSRF_EXEMPT_PATHS.some((path) => req.path.startsWith(path));
    if (isExempt || env.CSRF_ENABLED === false) return next();

    csrfMiddleware(req, res, (err) => {
      if (err instanceof Error) {
        return next(new HttpError(403, err.message));
      }
      next();
    });
  };
}
