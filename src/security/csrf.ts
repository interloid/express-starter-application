import { doubleCsrf } from 'csrf-csrf';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { registerCsrfDocs } from './csrf.docs.js';

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
  'auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/webhooks',
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
    getSessionIdentifier: (req: Request) => req.ip ?? '',
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
    if (isExempt) return next();

    return csrfMiddleware(req, res, next);
  };
}
