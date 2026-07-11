import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/response/response.js';
import { ttlToMs } from './services/token.service.js';
import { env } from '../../config/env.config.js';
import { UnauthorizedError } from '../../common/error/http-errors.js';
import {
  forgotPassword,
  loginService,
  logoutAllService,
  logoutService,
  refreshTokenService,
  registerService,
  resetPassword,
  verifyEmailService,
} from './auth.service.js';
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyMailDto,
} from './auth.schema.js';

const isProduction = env.NODE_ENV === 'production' ? true : false;

export async function register(req: Request, res: Response) {
  const data = req.body as RegisterDto;
  const result = await registerService(data);
  sendSuccess(res, result);
}
function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };
  res.cookie('access_token', accessToken, {
    ...base,
    maxAge: ttlToMs(env.JWT_ACCESS_TTL),
  });
  res.cookie('refresh_token', refreshToken, {
    ...base,
    maxAge: ttlToMs(env.JWT_REFRESH_TTL),
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginDto;
    const result = await loginService(email, password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    if (env.COOKIE_AUTH) {
      setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    sendSuccess(res, { ...result }, { message: 'Logged in successfully' });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    const headerToken = req.headers['refresh_token'] as string | undefined;
    const token = cookieToken ?? headerToken;

    if (!token) throw new UnauthorizedError('No refresh token');
    const tokens = await refreshTokenService(token, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    if (env.COOKIE_AUTH) {
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    }
    sendSuccess(res, { ...tokens }, { message: 'Token refreshed' });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    const headerToken = req.headers['refresh_token'] as string | undefined;
    const token = cookieToken ?? headerToken;
    if (!token) {
      throw new UnauthorizedError('Token missing');
    }
    await logoutService(token);
    if (env.COOKIE_AUTH) {
      clearAuthCookies(res);
    }
    sendSuccess(res, null, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    await logoutAllService(req.user.id);
    clearAuthCookies(res);
    sendSuccess(res, null, { message: 'Logged out of all sessions' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token } = req.body as VerifyMailDto;
    await verifyEmailService(token);
    sendSuccess(res, null, { message: 'Mail verified successfully' });
  } catch (err) {
    next(err);
  }
};

export async function forgotPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as ForgotPasswordDto;
    await forgotPassword(email);
    sendSuccess(res, null, { message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, newPassword } = req.body as ResetPasswordDto;
    await resetPassword(token, newPassword);
    sendSuccess(res, null, { message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
}
