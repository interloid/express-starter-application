import dotevn from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotevn.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),

    NEW_RELIC_APP_NAME: z.string().optional(),
    NEW_RELIC_LICENSE_KEY: z.string().optional(),
    SWAGGER_ENABLED: z.coerce.boolean().default(false),

    CORS_ORIGINS: z.string().default(''),

    CSRF_ENABLED: z.coerce.boolean().default(false),
    CSRF_SECRET: z.string().optional(),

    REDIS_URL: z.url(),
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
