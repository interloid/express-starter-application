import z from 'zod';
import { swaggerRegistry } from '../../config/swagger.config.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schema.js';

export function registerAuthDocs() {
  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['Auth'],
    request: {
      body: { content: { 'application/json': { schema: loginSchema } } },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: { 'application/json': { schema: { type: 'object' } } },
      },
      401: { description: 'Invalid credentials' },
      429: { description: 'Too many attempts' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags: ['Auth'],
    request: {
      headers: z.object({ refresh_token: z.string() }),
    },
    responses: {
      200: { description: 'Token refreshed' },
      401: { description: 'Refresh token invalid' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['Auth'],
    request: {
      headers: z.object({ access_token: z.string(), refresh_token: z.string() }),
    },
    responses: { 204: { description: 'Logged out successfully' } },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/logout-all',
    tags: ['Auth'],
    request: {
      headers: z.object({ access_token: z.string() }),
    },
    security: [{ bearerAuth: [] }],
    responses: {
      204: { description: 'All sessions logged out' },
      401: { description: 'Unauthorized' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: registerSchema,
          },
        },
      },
    },
    responses: {
      200: { description: 'User registered successfully' },
      400: { description: 'Validation error' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/verify-mail',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({ token: z.string() }),
          },
        },
      },
    },
    responses: {
      200: { description: 'User registered successfully' },
      400: { description: 'Validation error' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/forgot-password',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: forgotPasswordSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset link sent successfully',
      },
      400: {
        description: 'Validation error',
      },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/auth/reset-password',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: resetPasswordSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset successfully',
      },
      400: {
        description: 'Validation error',
      },
    },
  });
}
