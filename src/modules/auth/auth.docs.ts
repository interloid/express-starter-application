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
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
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
    path: '/api/v1/auth/refresh',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
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
    path: '/api/v1/auth/logout',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
    request: {
      headers: z.object({ access_token: z.string(), refresh_token: z.string() }),
    },
    responses: { 204: { description: 'Logged out successfully' } },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/api/v1/auth/logout-all',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
    request: {
      headers: z.object({ access_token: z.string() }),
    },
    responses: {
      204: { description: 'All sessions logged out' },
      401: { description: 'Unauthorized' },
    },
  });

  swaggerRegistry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
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
    path: '/api/v1/auth/verify-mail',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
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
    path: '/api/v1/auth/forgot-password',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
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
    path: '/api/v1/auth/reset-password',
    tags: ['Auth'],
    security: [{ accessTokenAuth: [] }, { refreshTokenAuth: [] }],
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
