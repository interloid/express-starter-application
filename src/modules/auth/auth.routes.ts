import { Router } from 'express';

import {
  forgotPasswordHandler,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resetPasswordHandler,
  verifyEmail,
} from './auth.controller.js';
import { authLimiter } from '../../security/rate-limit.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { requireAuth } from './auth.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyMailSchema,
} from './auth.schema.js';
import { registerAuthDocs } from './auth.docs.js';

registerAuthDocs();

export const authRouter = Router();

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', requireAuth, logout);
authRouter.post('/logout-all', requireAuth, logoutAll);
authRouter.post('/register', authLimiter, validate({ body: loginSchema }), register);
authRouter.post('/verify-mail', authLimiter, validate({ body: verifyMailSchema }), verifyEmail);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPasswordHandler,
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  resetPasswordHandler,
);
