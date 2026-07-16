import dotevn from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotevn.config({ path: path.resolve(process.cwd(), '.env') });

const zBool = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return val;
}, z.boolean());

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
    DATABASE_URL: z.url(),

    NEW_RELIC_APP_NAME: z.string().optional(),
    NEW_RELIC_LICENSE_KEY: z.string().optional(),
    SWAGGER_ENABLED: zBool.default(false),

    CORS_ORIGINS: z.string().default(''),

    CSRF_ENABLED: zBool.default(false),
    CSRF_SECRET: z.string().optional(),

    REDIS_URL: z.url(),

    JWT_ISSUER: z.string().default('express-starter-app'),
    JWT_AUDIENCE: z.string().default('express-starter-app-client'),
    JWT_ALGORITHM: z.string().default('HS256'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),

    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string(),
    SMTP_PASSWORD: z.string(),
    MAIL_FROM: z.email().default('no-reply@example.com'),
    FRONTEND_URL: z.url(),

    COOKIE_AUTH: zBool.default(false),

    RATE_LIMIT_ENABLED: zBool.default(false),

    AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS Access Key is required'),
    AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS Secret Access Key is required'),
    AWS_REGION: z.string().min(1, 'AWS Region is required').default('us-east-1'),
    AWS_S3_BUCKET_NAME: z.string().min(1, 'S3 Bucket Name is required'),

    GIT_COMMIT: z.string().default('unknown'),
    BUILD_TIME: z.string().default('unknown'),
  })
  .superRefine((env, ctx) => {
    if (env.CSRF_ENABLED && !env.CSRF_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['CSRF_SECRET'],
        message: 'CSRF_SECRET is required when CSRF_ENABLED=true',
      });
    }
  });
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const flattened = z.flattenError(_env.error);
  const fieldErrors = flattened.fieldErrors;

  const formattedErrors = Object.entries(fieldErrors)
    .map(([field, errors]) => `[${field}]: ${errors?.join(', ')}`)
    .join('\n');
  console.log(`\nInvalid environment configuration:\n${formattedErrors}\n`);

  process.exit(1);
}

export const env = _env.data;
